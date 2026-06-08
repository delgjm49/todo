#!/usr/bin/env python3
"""Asynchronous/batch image generation job wrapper.

This launches repo-scoped background jobs around tools/ai-image.py. It intentionally
never opens generated images automatically; use the `open` or `reveal` commands after
reviewing status/results.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shlex
import subprocess
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".img"}
TERMINAL_ITEM_STATUSES = {"completed", "failed"}
TERMINAL_JOB_STATUSES = {"completed", "partial", "failed"}
DEFAULT_MAX_PARALLEL = 2


def safe_slug(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return (slug[:max_len].strip("-") or "image")


def now_iso() -> str:
    return dt.datetime.now(dt.UTC).isoformat()


def write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise SystemExit(f"Invalid job JSON: {path}")
    return data


def git_root(cwd: Path) -> Path | None:
    try:
        raw = subprocess.check_output(
            ["git", "-C", str(cwd), "rev-parse", "--show-toplevel"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return Path(raw) if raw else None


def repo_info(repo_arg: str | None) -> dict[str, str]:
    cwd = Path(repo_arg).expanduser().resolve() if repo_arg else Path.cwd().resolve()
    root = git_root(cwd) or cwd
    return {"path": str(root), "slug": safe_slug(root.name, 40)}


def default_repo_base(repo_slug: str) -> Path:
    return Path.home() / "Pictures" / "ai-generated" / "by-repo" / repo_slug


def collect_prompts(args: argparse.Namespace) -> list[str]:
    prompts: list[str] = []
    prompts.extend(args.prompts or [])
    prompts.extend(args.prompt or [])
    if args.prompt_file:
        prompt_path = Path(args.prompt_file).expanduser()
        if prompt_path.suffix.lower() == ".json":
            parsed = json.loads(prompt_path.read_text(encoding="utf-8"))
            if isinstance(parsed, list):
                prompts.extend(str(x) for x in parsed if str(x).strip())
            elif isinstance(parsed, dict) and isinstance(parsed.get("prompts"), list):
                prompts.extend(str(x) for x in parsed["prompts"] if str(x).strip())
            else:
                raise SystemExit("--prompt-file JSON must be a list or an object with a prompts list")
        else:
            for line in prompt_path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if stripped and not stripped.startswith("#"):
                    prompts.append(stripped)
    prompts = [p.strip() for p in prompts if p and p.strip()]
    if not prompts:
        raise SystemExit("At least one prompt is required")
    return prompts


def provider_options_from_args(args: argparse.Namespace) -> dict[str, Any]:
    keys = [
        "provider",
        "model",
        "image_model",
        "openrouter_api",
        "quality",
        "size",
        "aspect_ratio",
        "background",
        "output_format",
        "output_compression",
        "moderation",
        "timeout",
        "poll_interval",
        "no_modalities",
        "param",
    ]
    return {key: getattr(args, key) for key in keys if hasattr(args, key) and getattr(args, key) not in (None, [], False)}


def create_job(args: argparse.Namespace) -> dict[str, Any]:
    prompts = collect_prompts(args)
    if args.count < 1:
        raise SystemExit("--count must be >= 1")
    if args.max_parallel < 1:
        raise SystemExit("--max-parallel must be >= 1")

    repo = repo_info(args.repo)
    task_slug = safe_slug(args.task or prompts[0], 40)
    job_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    output_root = Path(args.output_root).expanduser() if args.output_root else default_repo_base(repo["slug"])
    job_dir = output_root / dt.date.today().isoformat() / task_slug / job_id

    items: list[dict[str, Any]] = []
    index = 1
    for prompt_index, prompt in enumerate(prompts, start=1):
        for copy_index in range(1, args.count + 1):
            items.append(
                {
                    "index": index,
                    "promptIndex": prompt_index,
                    "copyIndex": copy_index,
                    "prompt": prompt,
                    "status": "queued",
                    "outputDir": str(job_dir / "items" / f"{index:03d}"),
                    "imagePaths": [],
                    "allFiles": [],
                }
            )
            index += 1

    return {
        "id": job_id,
        "kind": "ai-image-job",
        "schemaVersion": 1,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "status": "queued",
        "repo": repo,
        "task": task_slug,
        "outputDir": str(job_dir),
        "jobFile": str(job_dir / "job.json"),
        "workerLog": str(job_dir / "worker.log"),
        "notify": bool(args.notify),
        "requestDryRun": bool(args.request_dry_run),
        "maxParallel": args.max_parallel,
        "providerOptions": provider_options_from_args(args),
        "items": items,
    }


def append_worker_log(job: dict[str, Any], line: str) -> None:
    path = Path(str(job["workerLog"]))
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().isoformat(timespec="seconds")
    with path.open("a", encoding="utf-8") as f:
        f.write(f"[{stamp}] {line}\n")


def ai_image_command(job: dict[str, Any], item: dict[str, Any]) -> list[str]:
    script = Path(__file__).with_name("ai-image.py")
    opts = job.get("providerOptions", {})
    cmd = [sys.executable, str(script), str(item["prompt"]), "--provider", str(opts.get("provider", "openrouter")), "--output-dir", str(item["outputDir"]), "--no-links"]
    passthrough: list[tuple[str, str]] = [
        ("model", "--model"),
        ("image_model", "--image-model"),
        ("openrouter_api", "--openrouter-api"),
        ("quality", "--quality"),
        ("size", "--size"),
        ("aspect_ratio", "--aspect-ratio"),
        ("background", "--background"),
        ("output_format", "--output-format"),
        ("moderation", "--moderation"),
        ("timeout", "--timeout"),
        ("poll_interval", "--poll-interval"),
    ]
    for key, flag in passthrough:
        value = opts.get(key)
        if value is not None:
            cmd.extend([flag, str(value)])
    if opts.get("output_compression") is not None:
        cmd.extend(["--output-compression", str(opts["output_compression"])])
    if opts.get("no_modalities"):
        cmd.append("--no-modalities")
    for param in opts.get("param") or []:
        cmd.extend(["--param", str(param)])
    if job.get("requestDryRun"):
        cmd.append("--dry-run")
    return cmd


def item_files(item_dir: Path) -> tuple[list[str], list[str]]:
    if not item_dir.exists():
        return [], []
    files = sorted(p for p in item_dir.rglob("*") if p.is_file())
    all_files = [str(p) for p in files]
    image_paths = [str(p) for p in files if p.suffix.lower() in IMAGE_EXTS]
    return all_files, image_paths


def run_item(job: dict[str, Any], item: dict[str, Any], job_path: Path, lock: threading.Lock) -> None:
    item_dir = Path(str(item["outputDir"]))
    item_dir.mkdir(parents=True, exist_ok=True)
    stdout_path = item_dir / "run.stdout"
    stderr_path = item_dir / "run.stderr"
    cmd = ai_image_command(job, item)

    with lock:
        item.update({"status": "running", "startedAt": now_iso(), "command": shlex.join(cmd)})
        job["updatedAt"] = now_iso()
        write_json_atomic(job_path, job)
    append_worker_log(job, f"item {item['index']:03d} started")

    try:
        result = subprocess.run(cmd, text=True, capture_output=True, cwd=job["repo"]["path"], check=False)
        stdout_path.write_text(result.stdout, encoding="utf-8")
        stderr_path.write_text(result.stderr, encoding="utf-8")
        all_files, image_paths = item_files(item_dir)
        status = "completed" if result.returncode == 0 else "failed"
        update: dict[str, Any] = {
            "status": status,
            "completedAt": now_iso(),
            "exitCode": result.returncode,
            "stdout": str(stdout_path),
            "stderr": str(stderr_path),
            "allFiles": all_files,
            "imagePaths": image_paths,
        }
        if result.returncode != 0:
            update["error"] = (result.stderr or result.stdout).strip()[-2000:]
        with lock:
            item.update(update)
            job["updatedAt"] = now_iso()
            write_json_atomic(job_path, job)
        append_worker_log(job, f"item {item['index']:03d} {status} exit={result.returncode} images={len(image_paths)}")
    except Exception as exc:  # noqa: BLE001 - background worker should persist failures in job JSON.
        with lock:
            item.update({"status": "failed", "completedAt": now_iso(), "error": str(exc), "imagePaths": [], "allFiles": []})
            job["updatedAt"] = now_iso()
            write_json_atomic(job_path, job)
        append_worker_log(job, f"item {item['index']:03d} failed exception={exc}")


def notify(title: str, body: str) -> None:
    if sys.platform != "darwin":
        return
    safe_title = title.replace('"', '\\"')
    safe_body = body.replace('"', '\\"')
    subprocess.Popen(
        ["osascript", "-e", f'display notification "{safe_body}" with title "{safe_title}"'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


def finalize_job_status(job: dict[str, Any]) -> str:
    items = job.get("items", [])
    completed = sum(1 for item in items if item.get("status") == "completed")
    failed = sum(1 for item in items if item.get("status") == "failed")
    if failed == 0:
        return "completed"
    if completed > 0:
        return "partial"
    return "failed"


def worker(job_path: Path) -> int:
    job = load_json(job_path)
    lock = threading.Lock()
    job.update({"status": "running", "startedAt": now_iso(), "updatedAt": now_iso(), "workerPid": os.getpid()})
    write_json_atomic(job_path, job)
    append_worker_log(job, f"job {job['id']} running pid={os.getpid()} maxParallel={job.get('maxParallel')}")

    items = job.get("items", [])
    with ThreadPoolExecutor(max_workers=int(job.get("maxParallel") or DEFAULT_MAX_PARALLEL)) as pool:
        futures = [pool.submit(run_item, job, item, job_path, lock) for item in items]
        for future in as_completed(futures):
            future.result()

    with lock:
        status = finalize_job_status(job)
        job.update({"status": status, "completedAt": now_iso(), "updatedAt": now_iso()})
        write_json_atomic(job_path, job)
    completed = sum(1 for item in items if item.get("status") == "completed")
    failed = sum(1 for item in items if item.get("status") == "failed")
    images = sum(len(item.get("imagePaths") or []) for item in items)
    append_worker_log(job, f"job {job['id']} finished status={status} completed={completed} failed={failed} images={images}")
    if job.get("notify") and not job.get("requestDryRun"):
        notify("AI image batch complete", f"{job['repo']['slug']} {job['task']} — {status}, {images} image(s). Ask the agent to open results.")
    return 0 if status == "completed" else 1


def job_glob(repo_slug: str, output_root: str | None = None) -> list[Path]:
    base = Path(output_root).expanduser() if output_root else default_repo_base(repo_slug)
    return sorted(base.glob("*/*/*/job.json"), key=lambda p: p.stat().st_mtime if p.exists() else 0, reverse=True)


def list_jobs(args: argparse.Namespace) -> list[dict[str, Any]]:
    repo = repo_info(args.repo)
    jobs: list[dict[str, Any]] = []
    for path in job_glob(repo["slug"], getattr(args, "output_root", None)):
        try:
            job = load_json(path)
            job["jobFile"] = str(path)
            jobs.append(job)
        except Exception:
            continue
    return jobs


def resolve_job(args: argparse.Namespace, token: str | None) -> dict[str, Any]:
    if token and token not in {"latest", "last"}:
        p = Path(token).expanduser()
        if p.is_dir():
            p = p / "job.json"
        if p.exists():
            return load_json(p)
    jobs = list_jobs(args)
    if not jobs:
        raise SystemExit("No image jobs found for this repo")
    if not token or token in {"latest", "last"}:
        return jobs[0]
    matches = [job for job in jobs if str(job.get("id", "")).startswith(token)]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise SystemExit(f"No image job matches {token!r}")
    raise SystemExit(f"Ambiguous image job prefix {token!r}: {', '.join(str(j.get('id')) for j in matches[:5])}")


def summarize_counts(job: dict[str, Any]) -> tuple[int, int, int, int]:
    items = job.get("items", [])
    total = len(items)
    completed = sum(1 for item in items if item.get("status") == "completed")
    failed = sum(1 for item in items if item.get("status") == "failed")
    images = sum(len(item.get("imagePaths") or []) for item in items)
    return total, completed, failed, images


def command_submit(args: argparse.Namespace) -> int:
    job = create_job(args)
    job_path = Path(str(job["jobFile"]))
    if args.dry_run:
        print(json.dumps(job, indent=2, ensure_ascii=False))
        return 0
    job_path.parent.mkdir(parents=True, exist_ok=True)
    write_json_atomic(job_path, job)
    log_path = Path(str(job["workerLog"]))
    log_path.touch()
    cmd = [sys.executable, str(Path(__file__)), "worker", str(job_path)]
    with log_path.open("a", encoding="utf-8") as log:
        subprocess.Popen(cmd, stdout=log, stderr=log, cwd=job["repo"]["path"], start_new_session=True)
    total, _, _, _ = summarize_counts(job)
    print(f"Submitted image job {job['id']} ({total} request(s))")
    print(f"Job file: {job_path}")
    print(f"Output dir: {job['outputDir']}")
    print("Images will not open automatically. Use `tools/ai-image-async.py results latest` and `tools/ai-image-async.py open latest`.")
    return 0


def command_status(args: argparse.Namespace) -> int:
    if args.job:
        jobs = [resolve_job(args, args.job)]
    else:
        jobs = list_jobs(args)[: args.limit]
    if not jobs:
        print("No image jobs found for this repo")
        return 0
    for job in jobs:
        total, completed, failed, images = summarize_counts(job)
        print(f"{job.get('id')}\t{job.get('status')}\titems={completed}/{total} failed={failed} images={images}\ttask={job.get('task')}\tout={job.get('outputDir')}")
    return 0


def file_url(path: str) -> str:
    return Path(path).resolve().as_uri()


def command_results(args: argparse.Namespace) -> int:
    job = resolve_job(args, args.job)
    total, completed, failed, images = summarize_counts(job)
    print(f"Job: {job.get('id')} status={job.get('status')} items={completed}/{total} failed={failed} images={images}")
    print(f"Output dir: {job.get('outputDir')}")
    for item in job.get("items", []):
        prompt = str(item.get("prompt", "")).replace("\n", " ")
        if len(prompt) > 100:
            prompt = prompt[:97] + "..."
        print(f"\n[{int(item.get('index', 0)):03d}] {item.get('status')} — {prompt}")
        if item.get("error"):
            print(f"  error: {str(item['error']).splitlines()[-1][:300]}")
        for image_path in item.get("imagePaths") or []:
            print(f"  {image_path}")
            if not args.no_links:
                print(f"  {file_url(image_path)}")
    if images == 0:
        print("\nNo saved images yet. Check status again later or inspect worker/item logs.")
    return 0


def selected_image_paths(job: dict[str, Any], indexes: list[int] | None) -> list[str]:
    paths: list[str] = []
    wanted = set(indexes or [])
    for item in job.get("items", []):
        if wanted and int(item.get("index", 0)) not in wanted:
            continue
        paths.extend(str(p) for p in item.get("imagePaths") or [])
    return paths


def command_open(args: argparse.Namespace) -> int:
    job = resolve_job(args, args.job)
    paths = selected_image_paths(job, args.index)
    if not paths:
        print("No images to open for the selected job/items", file=sys.stderr)
        return 1
    subprocess.run(["open", *paths], check=False)
    print(f"Opened {len(paths)} image(s)")
    return 0


def command_reveal(args: argparse.Namespace) -> int:
    job = resolve_job(args, args.job)
    path = str(job.get("outputDir"))
    subprocess.run(["open", path], check=False)
    print(path)
    return 0


def add_common_lookup_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--repo", help="Repo path for resolving the repo-scoped job list; defaults to cwd")
    parser.add_argument("--output-root", help="Override output root when jobs were submitted with a custom root")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Submit and manage asynchronous AI image-generation jobs.")
    sub = parser.add_subparsers(dest="command", required=True)

    submit = sub.add_parser("submit", help="Submit one or more image requests and return immediately")
    submit.add_argument("prompts", nargs="*", help="Prompt(s). Quote prompts containing spaces.")
    submit.add_argument("--prompt", action="append", help="Additional prompt. Repeatable.")
    submit.add_argument("--prompt-file", help="Text file with one prompt per line, or JSON list/object with prompts")
    submit.add_argument("--count", type=int, default=1, help="Number of variants/copies per prompt")
    submit.add_argument("--task", help="Task/output slug, e.g. logo-refresh")
    submit.add_argument("--repo", help="Repo path used for repo-scoped output organization; defaults to cwd")
    submit.add_argument("--output-root", help="Override output root; default is ~/Pictures/ai-generated/by-repo/<repo>")
    submit.add_argument("--max-parallel", type=int, default=DEFAULT_MAX_PARALLEL)
    submit.add_argument("--notify", dest="notify", action="store_true", default=True, help="Send an OS notification when the background job finishes")
    submit.add_argument("--no-notify", dest="notify", action="store_false")
    submit.add_argument("--dry-run", action="store_true", help="Print the job plan without writing files or launching a worker")
    submit.add_argument("--request-dry-run", action="store_true", help="Launch worker, but pass --dry-run to each provider request")
    submit.add_argument("--provider", choices=["atlascloud", "llmgateway", "openrouter"], default="openrouter")
    submit.add_argument("--model")
    submit.add_argument("--image-model")
    submit.add_argument("--openrouter-api", choices=["responses", "chat"], default="responses")
    submit.add_argument("--quality")
    submit.add_argument("--size")
    submit.add_argument("--aspect-ratio", dest="aspect_ratio")
    submit.add_argument("--background")
    submit.add_argument("--output-format", dest="output_format")
    submit.add_argument("--output-compression", type=int)
    submit.add_argument("--moderation")
    submit.add_argument("--param", action="append", default=[], metavar="KEY=VALUE", help="Extra provider parameter. Repeatable.")
    submit.add_argument("--timeout", type=int, default=180)
    submit.add_argument("--poll-interval", type=int, default=2)
    submit.add_argument("--no-modalities", action="store_true")
    submit.set_defaults(func=command_submit)

    status = sub.add_parser("status", help="Show latest jobs or one job")
    status.add_argument("job", nargs="?", help="Job id/prefix/path, or latest")
    status.add_argument("--limit", type=int, default=10)
    add_common_lookup_args(status)
    status.set_defaults(func=command_status)

    results = sub.add_parser("results", help="Print saved image paths/links for a job")
    results.add_argument("job", nargs="?", default="latest")
    results.add_argument("--no-links", action="store_true")
    add_common_lookup_args(results)
    results.set_defaults(func=command_results)

    open_cmd = sub.add_parser("open", help="Open saved image(s) for a job on request")
    open_cmd.add_argument("job", nargs="?", default="latest")
    open_cmd.add_argument("--index", type=int, action="append", help="Only open a specific item index. Repeatable.")
    add_common_lookup_args(open_cmd)
    open_cmd.set_defaults(func=command_open)

    reveal = sub.add_parser("reveal", help="Reveal a job output directory in Finder")
    reveal.add_argument("job", nargs="?", default="latest")
    add_common_lookup_args(reveal)
    reveal.set_defaults(func=command_reveal)

    worker_parser = sub.add_parser("worker", help=argparse.SUPPRESS)
    worker_parser.add_argument("job_file")
    worker_parser.set_defaults(func=lambda args: worker(Path(args.job_file).expanduser()))
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
