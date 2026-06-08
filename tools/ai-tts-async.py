#!/usr/bin/env python3
"""Asynchronous/batch TTS job wrapper.

This launches repo-scoped background jobs around tools/ai-tts.py. It intentionally
never opens generated audio automatically; use the `open` or `reveal` commands after
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
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

AUDIO_EXTS = {".mp3", ".wav", ".pcm", ".ulaw", ".alaw", ".m4a", ".ogg", ".flac"}
DEFAULT_MAX_PARALLEL = 2
DEFAULT_VOICE_ID = "ara"
VOICE_GROUPS: dict[str, list[str]] = {
    "english-female": ["ara", "eve", "f8cf5c2c78d4", "79f3a8b96d43"],
}
VOICE_NAMES: dict[str, str] = {
    "ara": "Ara",
    "eve": "Eve",
    "f8cf5c2c78d4": "Grace",
    "79f3a8b96d43": "Claire",
}


def safe_slug(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return (slug[:max_len].strip("-") or "tts")


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
    return Path.home() / "Music" / "ai-generated" / "by-repo" / repo_slug


def collect_texts(args: argparse.Namespace) -> list[str]:
    texts: list[str] = []
    texts.extend(args.texts or [])
    texts.extend(args.text or [])
    if args.text_file:
        text_path = Path(args.text_file).expanduser()
        if text_path.suffix.lower() == ".json":
            parsed = json.loads(text_path.read_text(encoding="utf-8"))
            if isinstance(parsed, list):
                texts.extend(str(x) for x in parsed if str(x).strip())
            elif isinstance(parsed, dict) and isinstance(parsed.get("texts"), list):
                texts.extend(str(x) for x in parsed["texts"] if str(x).strip())
            else:
                raise SystemExit("--text-file JSON must be a list or an object with a texts list")
        else:
            # Text files default to one full narration, preserving paragraph breaks. Use --linewise
            # when each non-comment line should become a separate TTS request.
            raw = text_path.read_text(encoding="utf-8")
            if args.linewise:
                for line in raw.splitlines():
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#"):
                        texts.append(stripped)
            else:
                if raw.strip():
                    texts.append(raw.strip())
    texts = [t.strip() for t in texts if t and t.strip()]
    if not texts:
        raise SystemExit("At least one text is required")
    return texts


def collect_voices(args: argparse.Namespace) -> list[str]:
    voices: list[str] = []
    voices.extend(args.voice_id or [])
    if args.voice_group:
        voices.extend(VOICE_GROUPS[args.voice_group])
    if not voices:
        voices = [DEFAULT_VOICE_ID]
    deduped: list[str] = []
    for voice in voices:
        if voice not in deduped:
            deduped.append(voice)
    return deduped


def provider_options_from_args(args: argparse.Namespace) -> dict[str, Any]:
    keys = [
        "model",
        "language",
        "codec",
        "sample_rate",
        "bit_rate",
        "speed",
        "text_normalization",
        "optimize_streaming_latency",
        "timeout",
        "poll_interval",
        "param",
    ]
    return {key: getattr(args, key) for key in keys if hasattr(args, key) and getattr(args, key) not in (None, [], False)}


def create_job(args: argparse.Namespace) -> dict[str, Any]:
    texts = collect_texts(args)
    voices = collect_voices(args)
    if args.max_parallel < 1:
        raise SystemExit("--max-parallel must be >= 1")

    repo = repo_info(args.repo)
    task_slug = safe_slug(args.task or texts[0], 40)
    job_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    output_root = Path(args.output_root).expanduser() if args.output_root else default_repo_base(repo["slug"])
    job_dir = output_root / dt.date.today().isoformat() / task_slug / job_id

    items: list[dict[str, Any]] = []
    index = 1
    for text_index, text in enumerate(texts, start=1):
        for voice_id in voices:
            voice_name = VOICE_NAMES.get(voice_id, voice_id)
            items.append(
                {
                    "index": index,
                    "textIndex": text_index,
                    "voiceId": voice_id,
                    "voiceName": voice_name,
                    "text": text,
                    "status": "queued",
                    "outputDir": str(job_dir / "items" / f"{index:03d}-{safe_slug(voice_name, 24)}"),
                    "audioPaths": [],
                    "allFiles": [],
                }
            )
            index += 1

    return {
        "id": job_id,
        "kind": "ai-tts-job",
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


def ai_tts_command(job: dict[str, Any], item: dict[str, Any]) -> list[str]:
    script = Path(__file__).with_name("ai-tts.py")
    opts = job.get("providerOptions", {})
    cmd = [
        sys.executable,
        str(script),
        str(item["text"]),
        "--voice-id",
        str(item["voiceId"]),
        "--output-dir",
        str(item["outputDir"]),
        "--no-links",
    ]
    passthrough: list[tuple[str, str]] = [
        ("model", "--model"),
        ("language", "--language"),
        ("codec", "--codec"),
        ("sample_rate", "--sample-rate"),
        ("bit_rate", "--bit-rate"),
        ("speed", "--speed"),
        ("optimize_streaming_latency", "--optimize-streaming-latency"),
        ("timeout", "--timeout"),
        ("poll_interval", "--poll-interval"),
    ]
    for key, flag in passthrough:
        value = opts.get(key)
        if value is not None:
            cmd.extend([flag, str(value)])
    if opts.get("text_normalization"):
        cmd.append("--text-normalization")
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
    audio_paths = [str(p) for p in files if p.suffix.lower() in AUDIO_EXTS]
    return all_files, audio_paths


def run_item(job: dict[str, Any], item: dict[str, Any], job_path: Path, lock: threading.Lock) -> None:
    item_dir = Path(str(item["outputDir"]))
    item_dir.mkdir(parents=True, exist_ok=True)
    stdout_path = item_dir / "run.stdout"
    stderr_path = item_dir / "run.stderr"
    cmd = ai_tts_command(job, item)

    with lock:
        item.update({"status": "running", "startedAt": now_iso(), "command": shlex.join(cmd)})
        job["updatedAt"] = now_iso()
        write_json_atomic(job_path, job)
    append_worker_log(job, f"item {item['index']:03d} started voice={item.get('voiceId')}")

    try:
        result = subprocess.run(cmd, text=True, capture_output=True, cwd=job["repo"]["path"], check=False)
        stdout_path.write_text(result.stdout, encoding="utf-8")
        stderr_path.write_text(result.stderr, encoding="utf-8")
        all_files, audio_paths = item_files(item_dir)
        status = "completed" if result.returncode == 0 else "failed"
        update: dict[str, Any] = {
            "status": status,
            "completedAt": now_iso(),
            "exitCode": result.returncode,
            "stdout": str(stdout_path),
            "stderr": str(stderr_path),
            "allFiles": all_files,
            "audioPaths": audio_paths,
        }
        if result.returncode != 0:
            update["error"] = (result.stderr or result.stdout).strip()[-2000:]
        with lock:
            item.update(update)
            job["updatedAt"] = now_iso()
            write_json_atomic(job_path, job)
        append_worker_log(job, f"item {item['index']:03d} {status} exit={result.returncode} audio={len(audio_paths)}")
    except Exception as exc:  # noqa: BLE001 - background worker should persist failures in job JSON.
        with lock:
            item.update({"status": "failed", "completedAt": now_iso(), "error": str(exc), "audioPaths": [], "allFiles": []})
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


def write_job_readme(job: dict[str, Any]) -> None:
    out_dir = Path(str(job["outputDir"]))
    lines = [
        "# Async TTS job",
        "",
        f"Job: `{job.get('id')}`",
        f"Status: `{job.get('status')}`",
        f"Task: `{job.get('task')}`",
        "",
        "| Item | Voice | Status | Audio |",
        "| --- | --- | --- | --- |",
    ]
    for item in job.get("items", []):
        audio = item.get("audioPaths") or []
        first = audio[0] if audio else "(none)"
        lines.append(f"| {int(item.get('index', 0)):03d} | {item.get('voiceName')} (`{item.get('voiceId')}`) | {item.get('status')} | `{first}` |")
    (out_dir / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


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
        write_job_readme(job)
    completed = sum(1 for item in items if item.get("status") == "completed")
    failed = sum(1 for item in items if item.get("status") == "failed")
    audio = sum(len(item.get("audioPaths") or []) for item in items)
    append_worker_log(job, f"job {job['id']} finished status={status} completed={completed} failed={failed} audio={audio}")
    if job.get("notify") and not job.get("requestDryRun"):
        notify("AI TTS batch complete", f"{job['repo']['slug']} {job['task']} — {status}, {audio} audio file(s). Ask the agent to open results.")
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
        raise SystemExit("No TTS jobs found for this repo")
    if not token or token in {"latest", "last"}:
        return jobs[0]
    matches = [job for job in jobs if str(job.get("id", "")).startswith(token)]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise SystemExit(f"No TTS job matches {token!r}")
    raise SystemExit(f"Ambiguous TTS job prefix {token!r}: {', '.join(str(j.get('id')) for j in matches[:5])}")


def summarize_counts(job: dict[str, Any]) -> tuple[int, int, int, int]:
    items = job.get("items", [])
    total = len(items)
    completed = sum(1 for item in items if item.get("status") == "completed")
    failed = sum(1 for item in items if item.get("status") == "failed")
    audio = sum(len(item.get("audioPaths") or []) for item in items)
    return total, completed, failed, audio


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
    print(f"Submitted TTS job {job['id']} ({total} request(s))")
    print(f"Job file: {job_path}")
    print(f"Output dir: {job['outputDir']}")
    print("Audio will not open automatically. Use `tools/ai-tts-async.py results latest` and `tools/ai-tts-async.py open latest`.")
    return 0


def command_status(args: argparse.Namespace) -> int:
    if args.job:
        jobs = [resolve_job(args, args.job)]
    else:
        jobs = list_jobs(args)[: args.limit]
    if not jobs:
        print("No TTS jobs found for this repo")
        return 0
    for job in jobs:
        total, completed, failed, audio = summarize_counts(job)
        print(f"{job.get('id')}\t{job.get('status')}\titems={completed}/{total} failed={failed} audio={audio}\ttask={job.get('task')}\tout={job.get('outputDir')}")
    return 0


def file_url(path: str) -> str:
    return Path(path).resolve().as_uri()


def command_results(args: argparse.Namespace) -> int:
    job = resolve_job(args, args.job)
    total, completed, failed, audio = summarize_counts(job)
    print(f"Job: {job.get('id')} status={job.get('status')} items={completed}/{total} failed={failed} audio={audio}")
    print(f"Output dir: {job.get('outputDir')}")
    for item in job.get("items", []):
        text = str(item.get("text", "")).replace("\n", " ")
        if len(text) > 100:
            text = text[:97] + "..."
        print(f"\n[{int(item.get('index', 0)):03d}] {item.get('status')} — {item.get('voiceName')} ({item.get('voiceId')}) — {text}")
        if item.get("error"):
            print(f"  error: {str(item['error']).splitlines()[-1][:300]}")
        for audio_path in item.get("audioPaths") or []:
            print(f"  {audio_path}")
            if not args.no_links:
                print(f"  {file_url(audio_path)}")
    if audio == 0:
        print("\nNo saved audio yet. Check status again later or inspect worker/item logs.")
    return 0


def selected_audio_paths(job: dict[str, Any], indexes: list[int] | None) -> list[str]:
    paths: list[str] = []
    wanted = set(indexes or [])
    for item in job.get("items", []):
        if wanted and int(item.get("index", 0)) not in wanted:
            continue
        paths.extend(str(p) for p in item.get("audioPaths") or [])
    return paths


def command_open(args: argparse.Namespace) -> int:
    job = resolve_job(args, args.job)
    paths = selected_audio_paths(job, args.index)
    if not paths:
        print("No audio to open for the selected job/items", file=sys.stderr)
        return 1
    subprocess.run(["open", *paths], check=False)
    print(f"Opened {len(paths)} audio file(s)")
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
    parser = argparse.ArgumentParser(description="Submit and manage asynchronous Atlas Cloud TTS jobs.")
    sub = parser.add_subparsers(dest="command", required=True)

    submit = sub.add_parser("submit", help="Submit one or more TTS requests and return immediately")
    submit.add_argument("texts", nargs="*", help="Text(s). Quote text containing spaces.")
    submit.add_argument("--text", action="append", help="Additional text. Repeatable.")
    submit.add_argument("--text-file", help="Text file for one narration, or JSON list/object with texts")
    submit.add_argument("--linewise", action="store_true", help="With --text-file, treat each non-comment line as a separate TTS request")
    submit.add_argument("--voice-id", action="append", help="Voice ID. Repeatable. Defaults to ara if omitted.")
    submit.add_argument("--voice-group", choices=sorted(VOICE_GROUPS), help="Generate once for each voice in a curated group")
    submit.add_argument("--task", help="Task/output slug")
    submit.add_argument("--repo", help="Repo path used for repo-scoped output organization; defaults to cwd")
    submit.add_argument("--output-root", help="Override output root; default is ~/Music/ai-generated/by-repo/<repo>")
    submit.add_argument("--max-parallel", type=int, default=DEFAULT_MAX_PARALLEL)
    submit.add_argument("--notify", dest="notify", action="store_true", default=True, help="Send an OS notification when the background job finishes")
    submit.add_argument("--no-notify", dest="notify", action="store_false")
    submit.add_argument("--dry-run", action="store_true", help="Print the job plan without writing files or launching a worker")
    submit.add_argument("--request-dry-run", action="store_true", help="Launch worker, but pass --dry-run to each provider request")
    submit.add_argument("--model", default="xai/tts-v1")
    submit.add_argument("--language", default="en")
    submit.add_argument("--codec", choices=["mp3", "wav", "pcm", "mulaw", "alaw"], default="mp3")
    submit.add_argument("--sample-rate", type=int, default=24000)
    submit.add_argument("--bit-rate", type=int, default=128000)
    submit.add_argument("--speed", type=float, default=1.0)
    submit.add_argument("--text-normalization", action="store_true")
    submit.add_argument("--optimize-streaming-latency", type=int, default=0)
    submit.add_argument("--param", action="append", default=[], metavar="KEY=VALUE", help="Extra provider parameter. Repeatable.")
    submit.add_argument("--timeout", type=int, default=180)
    submit.add_argument("--poll-interval", type=int, default=1)
    submit.set_defaults(func=command_submit)

    status = sub.add_parser("status", help="Show latest jobs or one job")
    status.add_argument("job", nargs="?", help="Job id/prefix/path, or latest")
    status.add_argument("--limit", type=int, default=10)
    add_common_lookup_args(status)
    status.set_defaults(func=command_status)

    results = sub.add_parser("results", help="Print saved audio paths/links for a job")
    results.add_argument("job", nargs="?", default="latest")
    results.add_argument("--no-links", action="store_true")
    add_common_lookup_args(results)
    results.set_defaults(func=command_results)

    open_cmd = sub.add_parser("open", help="Open saved audio file(s) for a job on request")
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
