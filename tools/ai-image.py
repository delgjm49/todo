#!/usr/bin/env python3
"""Generate images from local AI provider accounts.

Secrets are read from existing Pi config files and are never printed.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import mimetypes
import os
import re
import ssl
import subprocess
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

try:
    import certifi  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional dependency varies by Python install.
    certifi = None

DEFAULT_LLMGATEWAY_MODEL = "grok-imagine-image"
DEFAULT_OPENROUTER_CHAT_MODEL = "openai/gpt-5.5"
DEFAULT_OPENROUTER_IMAGE_MODEL = "openai/gpt-5.4-image-2"

IMAGE_URL_KEYS = {"image_url", "imageUrl", "url", "uri"}
BASE64_KEYS = {"b64_json", "base64", "image_base64", "data"}
DATA_URI_RE = re.compile(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", re.S)
URL_IMAGE_RE = re.compile(r"https?://[^\s)'\"]+")


class ConfigError(RuntimeError):
    pass


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise ConfigError(f"Missing config file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in {path}: {exc}") from exc


def resolve_secret(value: Any, label: str) -> str:
    if not value:
        raise ConfigError(f"Missing secret value for {label}")
    secret = str(value)
    if secret.startswith("!"):
        try:
            secret = subprocess.check_output(secret[1:], shell=True, text=True, stderr=subprocess.PIPE).strip()
        except subprocess.CalledProcessError as exc:
            raise ConfigError(f"Failed to resolve shell-backed secret for {label}: {exc.stderr.strip()}") from exc
    if not secret:
        raise ConfigError(f"Resolved empty secret for {label}")
    return secret


def llmgateway_config() -> tuple[str, str]:
    models_path = Path.home() / ".pi" / "agent" / "models.json"
    data = load_json(models_path)
    provider = data.get("providers", {}).get("llmgateway")
    if not isinstance(provider, dict):
        raise ConfigError("No llmgateway provider found in ~/.pi/agent/models.json")
    base_url = provider.get("baseUrl")
    api_key = provider.get("apiKey")
    if not base_url or not api_key:
        raise ConfigError("llmgateway provider is missing baseUrl/apiKey in ~/.pi/agent/models.json")
    return str(base_url).rstrip("/"), resolve_secret(api_key, "llmgateway apiKey")


def openrouter_config() -> tuple[str, str]:
    auth_path = Path.home() / ".pi" / "agent" / "auth.json"
    data = load_json(auth_path)
    provider = data.get("openrouter")
    if not isinstance(provider, dict):
        raise ConfigError("No openrouter auth found in ~/.pi/agent/auth.json")
    api_key = provider.get("key") or provider.get("apiKey") or provider.get("token")
    if not api_key:
        raise ConfigError("openrouter auth is missing a key in ~/.pi/agent/auth.json")
    return "https://openrouter.ai/api/v1", resolve_secret(api_key, "openrouter key")


def ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


def request_json(url: str, api_key: str, body: dict[str, Any], timeout: int) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/delgjm49/meta-workflow",
            "X-Title": "meta-workflow ai-image CLI",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
            raw = response.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Provider returned non-JSON response: {raw[:500]}") from exc
            if not isinstance(parsed, dict):
                raise RuntimeError(f"Provider returned unexpected JSON: {type(parsed).__name__}")
            return parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {exc.code} from provider: {raw[:2000]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Provider request failed: {exc}") from exc


def body_for(args: argparse.Namespace) -> tuple[str, str, dict[str, Any]]:
    if args.provider == "llmgateway":
        base_url, api_key = llmgateway_config()
        model = args.model or DEFAULT_LLMGATEWAY_MODEL
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": args.prompt}],
        }
        # Many OpenAI-compatible multimodal gateways accept/ignore modalities; include it because
        # image-output models advertise text->image or text->text+image capabilities.
        if not args.no_modalities:
            body["modalities"] = ["text", "image"]
        return f"{base_url}/chat/completions", api_key, body

    base_url, api_key = openrouter_config()
    chat_model = args.model or DEFAULT_OPENROUTER_CHAT_MODEL
    image_model = args.image_model or DEFAULT_OPENROUTER_IMAGE_MODEL
    parameters: dict[str, Any] = {"model": image_model}
    for key in ["quality", "size", "aspect_ratio", "background", "output_format", "moderation"]:
        val = getattr(args, key)
        if val is not None:
            parameters[key] = val
    if args.output_compression is not None:
        parameters["output_compression"] = args.output_compression
    tool = {"type": "openrouter:image_generation", "parameters": parameters}
    if args.openrouter_api == "chat":
        body = {
            "model": chat_model,
            "messages": [{"role": "user", "content": f"Create an image: {args.prompt}"}],
            "tools": [tool],
        }
        return f"{base_url}/chat/completions", api_key, body
    body = {
        "model": chat_model,
        "input": f"Generate an image: {args.prompt}",
        "tools": [tool],
    }
    return f"{base_url}/responses", api_key, body


def safe_slug(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return (slug[:max_len].strip("-") or "image")


def default_output_dir() -> Path:
    return Path.home() / "Pictures" / "ai-generated" / dt.date.today().isoformat()


def extension_for_mime(mime: str | None, fallback: str = ".png") -> str:
    if not mime:
        return fallback
    ext = mimetypes.guess_extension(mime.split(";", 1)[0].strip())
    if ext == ".jpe":
        return ".jpg"
    return ext or fallback


def looks_like_image_url(url: str) -> bool:
    lower = url.lower().split("?", 1)[0]
    return lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")) or any(
        marker in lower for marker in ["/image", "imagedelivery", "storage.googleapis", "cdn"]
    )


def extract_images(obj: Any) -> list[dict[str, str]]:
    found: list[dict[str, str]] = []

    def add_url(url: str) -> None:
        if url.startswith("http") and not any(x.get("url") == url for x in found):
            found.append({"kind": "url", "url": url})

    def add_b64(value: str, mime: str | None = None) -> None:
        if not value or len(value) < 100:
            return
        if not any(x.get("base64") == value for x in found):
            found.append({"kind": "base64", "base64": value, "mime": mime or "image/png"})

    def walk(value: Any, parent_key: str | None = None) -> None:
        if isinstance(value, dict):
            # OpenAI-style: {"image_url": {"url": "..."}}
            for k, v in value.items():
                if k in IMAGE_URL_KEYS:
                    if isinstance(v, str):
                        m = DATA_URI_RE.match(v)
                        if m:
                            add_b64(m.group(2), m.group(1))
                        elif v.startswith("http"):
                            add_url(v)
                    elif isinstance(v, dict) and isinstance(v.get("url"), str):
                        add_url(v["url"])
                if k in BASE64_KEYS and isinstance(v, str):
                    m = DATA_URI_RE.match(v)
                    if m:
                        add_b64(m.group(2), m.group(1))
                    elif (parent_key and "image" in parent_key.lower()) or "image" in k.lower() or k == "b64_json":
                        add_b64(v)
                walk(v, k)
        elif isinstance(value, list):
            for item in value:
                walk(item, parent_key)
        elif isinstance(value, str):
            m = DATA_URI_RE.match(value)
            if m:
                add_b64(m.group(2), m.group(1))
            else:
                for url in URL_IMAGE_RE.findall(value):
                    if looks_like_image_url(url):
                        add_url(url.rstrip(".,"))

    walk(obj)
    return found


def download_url(url: str, path: Path, timeout: int) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "meta-workflow-ai-image/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        data = response.read()
        content_type = response.headers.get("content-type")
    if path.suffix == ".img":
        path = path.with_suffix(extension_for_mime(content_type))
    path.write_bytes(data)


def emit_kitty_image(path: Path, chunk_size: int = 4096) -> None:
    """Emit a PNG/JPEG/WebP via Kitty graphics protocol (supported by Ghostty).

    This only works when the terminal/TUI layer passes graphics escapes through.
    """
    mime, _ = mimetypes.guess_type(path)
    fmt = {"image/png": 100, "image/jpeg": 24, "image/webp": 32}.get(mime or "", 100)
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    chunks = [encoded[i : i + chunk_size] for i in range(0, len(encoded), chunk_size)] or [""]
    for idx, chunk in enumerate(chunks):
        more = 1 if idx < len(chunks) - 1 else 0
        if idx == 0:
            sys.stdout.write(f"\033_Ga=T,f={fmt},q=2,m={more};{chunk}\033\\")
        else:
            sys.stdout.write(f"\033_Gq=2,m={more};{chunk}\033\\")
    sys.stdout.write("\n")
    sys.stdout.flush()


def save_outputs(response: dict[str, Any], args: argparse.Namespace, body: dict[str, Any]) -> list[Path]:
    out_dir = Path(args.output_dir).expanduser() if args.output_dir else default_output_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{dt.datetime.now().strftime('%H%M%S')}-{safe_slug(args.prompt)}-{uuid.uuid4().hex[:6]}"
    raw_path = out_dir / f"{stem}.response.json"
    meta_path = out_dir / f"{stem}.meta.json"
    raw_path.write_text(json.dumps(response, indent=2, ensure_ascii=False), encoding="utf-8")
    redacted_body = json.loads(json.dumps(body))
    saved: list[Path] = []

    for idx, image in enumerate(extract_images(response), start=1):
        if image["kind"] == "url":
            ext = Path(image["url"].split("?", 1)[0]).suffix
            if ext.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
                ext = ".img"
            path = out_dir / f"{stem}-{idx}{ext}"
            download_url(image["url"], path, args.timeout)
            if not path.exists() and ext == ".img":
                # download_url may have changed suffix based on content-type.
                candidates = sorted(out_dir.glob(f"{stem}-{idx}.*"))
                saved.extend([p for p in candidates if p.suffix != ".response.json"])
            else:
                saved.append(path)
        else:
            ext = extension_for_mime(image.get("mime"))
            path = out_dir / f"{stem}-{idx}{ext}"
            path.write_bytes(base64.b64decode(image["base64"], validate=False))
            saved.append(path)

    meta = {
        "createdAt": dt.datetime.now(dt.UTC).isoformat(),
        "provider": args.provider,
        "prompt": args.prompt,
        "request": redacted_body,
        "rawResponse": str(raw_path),
        "savedImages": [str(p) for p in saved],
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return [raw_path, meta_path, *saved]


def list_models(args: argparse.Namespace) -> int:
    if args.provider == "llmgateway":
        base_url, api_key = llmgateway_config()
        url = f"{base_url}/models"
    else:
        base_url, api_key = openrouter_config()
        url = f"{base_url}/models"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    try:
        with urllib.request.urlopen(req, timeout=args.timeout, context=ssl_context()) as response:
            data = json.load(response)
    except Exception as exc:  # noqa: BLE001 - CLI should show concise provider failures.
        print(f"Failed to list models: {exc}", file=sys.stderr)
        return 1
    for model in data.get("data", []):
        arch = model.get("architecture", {})
        out = arch.get("output_modalities") or []
        if args.images_only and "image" not in out:
            continue
        print(f"{model.get('id')}\t{model.get('name', '')}\tout={','.join(out)}")
    return 0


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def osc8_link(url: str, label: str) -> str:
    return f"\033]8;;{url}\033\\{label}\033]8;;\033\\"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate images via existing Pi OpenRouter/LLM Gateway credentials.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              tools/ai-image.py 'a tiny robot painting a sunset' --dry-run
              tools/ai-image.py 'a tiny robot painting a sunset' --provider llmgateway --model grok-imagine-image
              tools/ai-image.py 'a futuristic city' --provider openrouter --image-model openai/gpt-5-image --aspect-ratio 16:9
              tools/ai-image.py 'a logo' --provider openrouter --openrouter-api chat
            """
        ),
    )
    parser.add_argument("prompt", nargs="?", help="Image prompt. If omitted with --list-models, no prompt is needed.")
    parser.add_argument("--provider", choices=["llmgateway", "openrouter"], default="openrouter")
    parser.add_argument("--model", help="For llmgateway: image model. For openrouter: chat/planning model.")
    parser.add_argument("--image-model", help="OpenRouter server-tool image model")
    parser.add_argument("--openrouter-api", choices=["responses", "chat"], default="responses", help="OpenRouter endpoint for server tools")
    parser.add_argument("--quality")
    parser.add_argument("--size")
    parser.add_argument("--aspect-ratio", dest="aspect_ratio")
    parser.add_argument("--background")
    parser.add_argument("--output-format", dest="output_format")
    parser.add_argument("--output-compression", type=int)
    parser.add_argument("--moderation")
    parser.add_argument("--output-dir")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--dry-run", action="store_true", help="Print the redacted request and exit without calling provider")
    parser.add_argument("--open", action="store_true", help="Open saved image(s) with macOS open")
    parser.add_argument("--terminal-preview", action="store_true", help="Try to render saved image(s) inline using Kitty/Ghostty graphics")
    parser.add_argument("--no-links", action="store_true", help="Do not print file:// links for saved images")
    parser.add_argument("--osc8-links", action="store_true", help="Print OSC 8 terminal hyperlinks for saved images")
    parser.add_argument("--list-models", action="store_true")
    parser.add_argument("--images-only", action="store_true", help="With --list-models, show only image-output models")
    parser.add_argument("--no-modalities", action="store_true", help="Do not send modalities for llmgateway chat/completions")
    args = parser.parse_args()
    if not args.list_models and not args.prompt:
        parser.error("prompt is required unless --list-models is used")
    return args


def main() -> int:
    args = parse_args()
    if args.list_models:
        return list_models(args)
    try:
        url, api_key, body = body_for(args)
        if args.dry_run:
            print(json.dumps({"url": url, "body": body, "auth": "<redacted>"}, indent=2, ensure_ascii=False))
            return 0
        print(f"Generating via {args.provider} model={body.get('model')} ...", file=sys.stderr)
        response = request_json(url, api_key, body, args.timeout)
        outputs = save_outputs(response, args, body)
        image_paths = [p for p in outputs if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".img"}]
        for path in outputs:
            print(path)
        if image_paths and not args.no_links:
            print("\nImage links:")
            for path in image_paths:
                url = file_url(path)
                print(osc8_link(url, path.name) if args.osc8_links else url)
        if not image_paths:
            print("No image URL/base64 found in response; inspect the .response.json file above.", file=sys.stderr)
            return 2
        if args.terminal_preview:
            for path in image_paths:
                emit_kitty_image(path)
        if args.open:
            subprocess.run(["open", *[str(p) for p in image_paths]], check=False)
        return 0
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 - top-level CLI guard.
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
