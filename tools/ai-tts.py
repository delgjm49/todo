#!/usr/bin/env python3
"""Generate text-to-speech audio through Atlas Cloud.

Secrets are read from local machine config / Keychain and are never printed.
Outputs are repo-scoped and never autoplay by default.
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
import time
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

DEFAULT_MODEL = "xai/tts-v1"
ATLAS_BASE_URL = "https://api.atlascloud.ai/api/v1"
TTS_SCHEMA_URL = "https://static.atlascloud.ai/model/schema/xai-tts-v1.json"
AUDIO_URL_KEYS = {"audio_url", "audioUrl", "url", "uri", "output", "outputs"}
BASE64_KEYS = {"b64_json", "base64", "audio_base64", "data"}
DATA_URI_RE = re.compile(r"^data:(audio/[a-zA-Z0-9.+-]+);base64,(.+)$", re.S)
URL_RE = re.compile(r"https?://[^\s)'\"]+")
AUDIO_EXTS = {".mp3", ".wav", ".pcm", ".ulaw", ".alaw", ".m4a", ".ogg", ".flac"}
VOICE_GROUPS: dict[str, list[str]] = {
    # English-speaking female = universal multilingual female voices + English-optimized female voices.
    "english-female": ["ara", "eve", "f8cf5c2c78d4", "79f3a8b96d43"],
}
FALLBACK_VOICES: dict[str, dict[str, str]] = {
    "ara": {"name": "Ara", "language": "multilingual", "gender": "female", "character": "Warm and conversational"},
    "eve": {"name": "Eve", "language": "multilingual", "gender": "female", "character": "Energetic, upbeat"},
    "f8cf5c2c78d4": {"name": "Grace", "language": "en", "gender": "female", "age": "young"},
    "79f3a8b96d43": {"name": "Claire", "language": "en", "gender": "female", "age": "middle-aged"},
}


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


def load_optional_json(path: Path) -> Any | None:
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


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


def keychain_secret(service: str, account: str) -> str | None:
    if sys.platform != "darwin":
        return None
    try:
        secret = subprocess.check_output(
            ["security", "find-generic-password", "-s", service, "-a", account, "-w"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return secret or None


def atlascloud_api_key_optional() -> str | None:
    env_key = os.environ.get("ATLASCLOUD_API_KEY")
    if env_key:
        return resolve_secret(env_key, "ATLASCLOUD_API_KEY")
    env_cmd = os.environ.get("ATLASCLOUD_API_KEY_CMD")
    if env_cmd:
        return resolve_secret(f"!{env_cmd}", "ATLASCLOUD_API_KEY_CMD")

    auth = load_optional_json(Path.home() / ".pi" / "agent" / "auth.json")
    if isinstance(auth, dict) and isinstance(auth.get("atlascloud"), dict):
        provider = auth["atlascloud"]
        api_key = provider.get("key") or provider.get("apiKey") or provider.get("token")
        if api_key:
            return resolve_secret(api_key, "atlascloud key")

    models = load_optional_json(Path.home() / ".pi" / "agent" / "models.json")
    provider = models.get("providers", {}).get("atlascloud") if isinstance(models, dict) else None
    if isinstance(provider, dict):
        api_key = provider.get("apiKey") or provider.get("key") or provider.get("token")
        if api_key:
            return resolve_secret(api_key, "atlascloud apiKey")

    return keychain_secret("atlascloud.ai", "api-key")


def atlascloud_config() -> tuple[str, str]:
    api_key = atlascloud_api_key_optional()
    if not api_key:
        raise ConfigError(
            "No Atlas Cloud API key found. Set ATLASCLOUD_API_KEY, set ATLASCLOUD_API_KEY_CMD, "
            "add ~/.pi/agent/auth.json atlascloud.key, or store it in macOS Keychain as "
            "service=atlascloud.ai account=api-key."
        )
    return ATLAS_BASE_URL, api_key


def ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


def json_request(method: str, url: str, api_key: str | None, body: dict[str, Any] | None, timeout: int) -> dict[str, Any]:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "meta-workflow-ai-tts/1.0",
        "HTTP-Referer": "https://github.com/delgjm49/meta-workflow",
        "X-Title": "meta-workflow ai-tts CLI",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
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


def fetch_json_url(url: str, timeout: int) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "meta-workflow-ai-tts/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        parsed = json.load(response)
    if not isinstance(parsed, dict):
        raise RuntimeError(f"Unexpected JSON from {url}: {type(parsed).__name__}")
    return parsed


def voice_catalog(timeout: int) -> dict[str, dict[str, Any]]:
    try:
        schema = fetch_json_url(TTS_SCHEMA_URL, timeout)
        prop = schema["components"]["schemas"]["Input"]["properties"]["voice_id"]
        options = prop.get("x-enum-options") or {}
        if isinstance(options, dict) and options:
            return {str(k): v if isinstance(v, dict) else {} for k, v in options.items()}
    except Exception:
        pass
    return FALLBACK_VOICES


def safe_slug(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return (slug[:max_len].strip("-") or "tts")


def current_repo_root() -> Path | None:
    try:
        raw = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return Path(raw) if raw else None


def default_output_dir(task: str | None) -> Path:
    repo = current_repo_root()
    repo_slug = safe_slug(repo.name, 40) if repo else "no-repo"
    task_slug = safe_slug(task or "adhoc", 40)
    batch = f"{dt.datetime.now().strftime('%H%M%S')}-{uuid.uuid4().hex[:6]}"
    return Path.home() / "Music" / "ai-generated" / "by-repo" / repo_slug / dt.date.today().isoformat() / task_slug / batch


def extension_for_mime(mime: str | None, codec: str, fallback: str = ".mp3") -> str:
    if codec == "pcm":
        return ".pcm"
    if codec == "mulaw":
        return ".ulaw"
    if codec == "alaw":
        return ".alaw"
    if codec:
        ext = f".{codec.lower()}"
        if ext in AUDIO_EXTS:
            return ext
    if mime:
        ext = mimetypes.guess_extension(mime.split(";", 1)[0].strip())
        return ext or fallback
    return fallback


def looks_like_audio_url(url: str) -> bool:
    lower = url.lower().split("?", 1)[0]
    return lower.endswith(tuple(AUDIO_EXTS)) or any(marker in lower for marker in ["/audio", "/audios", "media/audios", "static.atlascloud.ai"])


def extract_audio(obj: Any) -> list[dict[str, str]]:
    found: list[dict[str, str]] = []

    def add_url(url: str) -> None:
        if url.startswith("http") and not any(x.get("url") == url for x in found):
            found.append({"kind": "url", "url": url})

    def add_b64(value: str, mime: str | None = None) -> None:
        if not value or len(value) < 100:
            return
        if not any(x.get("base64") == value for x in found):
            found.append({"kind": "base64", "base64": value, "mime": mime or "audio/mpeg"})

    def walk(value: Any, parent_key: str | None = None) -> None:
        if isinstance(value, dict):
            for k, v in value.items():
                if k in AUDIO_URL_KEYS:
                    if isinstance(v, str):
                        m = DATA_URI_RE.match(v)
                        if m:
                            add_b64(m.group(2), m.group(1))
                        elif v.startswith("http"):
                            add_url(v)
                    elif isinstance(v, list):
                        walk(v, k)
                    elif isinstance(v, dict):
                        walk(v, k)
                if k in BASE64_KEYS and isinstance(v, str):
                    m = DATA_URI_RE.match(v)
                    if m:
                        add_b64(m.group(2), m.group(1))
                    elif (parent_key and "audio" in parent_key.lower()) or "audio" in k.lower() or k == "b64_json":
                        add_b64(v)
                walk(v, k)
        elif isinstance(value, list):
            for item in value:
                walk(item, parent_key)
        elif isinstance(value, str):
            m = DATA_URI_RE.match(value)
            if m:
                add_b64(m.group(2), m.group(1))
            elif value.startswith("http") and ((parent_key or "").lower() in {"output", "outputs", "audio", "audios"} or looks_like_audio_url(value)):
                add_url(value.rstrip(".,"))
            else:
                for url in URL_RE.findall(value):
                    if looks_like_audio_url(url):
                        add_url(url.rstrip(".,"))

    walk(obj)
    return found


def download_url(url: str, path: Path, timeout: int) -> Path:
    req = urllib.request.Request(url, headers={"User-Agent": "meta-workflow-ai-tts/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        data = response.read()
        content_type = response.headers.get("content-type")
    if path.suffix == ".audio":
        path = path.with_suffix(extension_for_mime(content_type, ""))
    path.write_bytes(data)
    return path


def prediction_id(submission: dict[str, Any]) -> str:
    data = submission.get("data")
    if isinstance(data, dict) and data.get("id"):
        return str(data["id"])
    if submission.get("id"):
        return str(submission["id"])
    raise RuntimeError(f"Atlas Cloud did not return a prediction id: {json.dumps(submission)[:500]}")


def atlas_generate_audio(base_url: str, api_key: str, body: dict[str, Any], timeout: int, poll_interval: int) -> dict[str, Any]:
    submission = json_request("POST", f"{base_url}/model/generateAudio", api_key, body, timeout)
    request_id = prediction_id(submission)
    result_url = f"{base_url}/model/prediction/{urllib.parse.quote(request_id, safe='')}"
    deadline = time.monotonic() + timeout
    while True:
        if time.monotonic() >= deadline:
            raise RuntimeError(f"Atlas Cloud audio prediction {request_id} did not complete within {timeout}s")
        time.sleep(max(1, poll_interval))
        result = json_request("GET", result_url, api_key, None, timeout)
        data = result.get("data") if isinstance(result.get("data"), dict) else result
        status = str(data.get("status", "")).lower() if isinstance(data, dict) else ""
        if status in {"completed", "succeeded", "success"}:
            return {"provider": "atlascloud", "submission": submission, "result": result}
        if status in {"failed", "error", "cancelled", "canceled"}:
            error = data.get("error") if isinstance(data, dict) else None
            raise RuntimeError(f"Atlas Cloud audio prediction {request_id} failed: {error or json.dumps(result)[:500]}")
        if not status and extract_audio(result):
            return {"provider": "atlascloud", "submission": submission, "result": result}
        print(f"Atlas Cloud audio prediction {request_id} status={status or 'unknown'} ...", file=sys.stderr)


def parse_param(values: list[str]) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for raw in values:
        if "=" not in raw:
            raise ConfigError(f"Invalid --param {raw!r}; expected KEY=VALUE")
        key, value = raw.split("=", 1)
        key = key.strip()
        if not key:
            raise ConfigError(f"Invalid --param {raw!r}; parameter key is empty")
        try:
            params[key] = json.loads(value)
        except json.JSONDecodeError:
            params[key] = value
    return params


def voice_label(voice_id: str, catalog: dict[str, dict[str, Any]]) -> str:
    meta = catalog.get(voice_id, {})
    name = str(meta.get("name") or voice_id)
    return safe_slug(f"{name}-{voice_id}", 40)


def body_for(args: argparse.Namespace, voice_id: str) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": args.model,
        "text": args.text,
        "language": args.language,
        "voice_id": voice_id,
        "codec": args.codec,
        "sample_rate": args.sample_rate,
        "speed": args.speed,
        "text_normalization": args.text_normalization,
        "optimize_streaming_latency": args.optimize_streaming_latency,
    }
    if args.codec == "mp3" and args.bit_rate is not None:
        body["bit_rate"] = args.bit_rate
    for key, value in parse_param(args.param).items():
        if key in {"model", "text", "voice_id"}:
            raise ConfigError(f"--param must not override {key!r}; use the explicit CLI option instead")
        body[key] = value
    return body


def save_one(response: dict[str, Any], args: argparse.Namespace, voice_id: str, catalog: dict[str, dict[str, Any]], out_dir: Path, body: dict[str, Any]) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{dt.datetime.now().strftime('%H%M%S')}-{voice_label(voice_id, catalog)}"
    raw_path = out_dir / f"{stem}.response.json"
    meta_path = out_dir / f"{stem}.meta.json"
    raw_path.write_text(json.dumps(response, indent=2, ensure_ascii=False), encoding="utf-8")
    saved: list[Path] = []
    for idx, audio in enumerate(extract_audio(response), start=1):
        if audio["kind"] == "url":
            ext = Path(audio["url"].split("?", 1)[0]).suffix
            if ext.lower() not in AUDIO_EXTS:
                ext = extension_for_mime(None, args.codec, ".audio")
            path = out_dir / f"{stem}-{idx}{ext}"
            saved.append(download_url(audio["url"], path, args.timeout))
        else:
            ext = extension_for_mime(audio.get("mime"), args.codec)
            path = out_dir / f"{stem}-{idx}{ext}"
            path.write_bytes(base64.b64decode(audio["base64"], validate=False))
            saved.append(path)
    meta = {
        "createdAt": dt.datetime.now(dt.UTC).isoformat(),
        "provider": "atlascloud",
        "model": args.model,
        "voiceId": voice_id,
        "voice": catalog.get(voice_id, {}),
        "text": args.text,
        "request": body,
        "rawResponse": str(raw_path),
        "savedAudio": [str(p) for p in saved],
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return [raw_path, meta_path, *saved]


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def voices_for_args(args: argparse.Namespace, catalog: dict[str, dict[str, Any]]) -> list[str]:
    if args.voice_group:
        return VOICE_GROUPS[args.voice_group]
    return [args.voice_id]


def list_voices(args: argparse.Namespace) -> int:
    catalog = voice_catalog(args.timeout)
    rows: list[tuple[str, dict[str, Any]]] = []
    for voice_id, meta in catalog.items():
        language = str(meta.get("language") or "")
        gender = str(meta.get("gender") or "")
        if args.language_filter and language != args.language_filter:
            if not (args.language_filter == "en" and language == "multilingual" and args.include_multilingual):
                continue
        if args.gender and gender != args.gender:
            continue
        rows.append((voice_id, meta))
    rows.sort(key=lambda item: (str(item[1].get("language") or ""), str(item[1].get("gender") or ""), str(item[1].get("name") or item[0])))
    for voice_id, meta in rows:
        fields = [
            voice_id,
            str(meta.get("name") or ""),
            f"lang={meta.get('language', '')}",
            f"gender={meta.get('gender', '')}",
        ]
        if meta.get("age"):
            fields.append(f"age={meta['age']}")
        if meta.get("character"):
            fields.append(f"character={meta['character']}")
        if args.examples and meta.get("example"):
            fields.append(f"example={meta['example']}")
        print("\t".join(fields))
    return 0


def write_manifest(out_dir: Path, args: argparse.Namespace, outputs: list[dict[str, Any]]) -> Path:
    manifest = {
        "createdAt": dt.datetime.now(dt.UTC).isoformat(),
        "kind": "ai-tts-batch",
        "provider": "atlascloud",
        "model": args.model,
        "task": args.task,
        "text": args.text,
        "outputDir": str(out_dir),
        "outputs": outputs,
    }
    path = out_dir / "tts-manifest.json"
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    md = out_dir / "README.md"
    lines = ["# TTS outputs", "", f"Created: {manifest['createdAt']}", f"Text: {args.text}", "", "| Voice | ID | Audio |", "| --- | --- | --- |"]
    for item in outputs:
        audio = item.get("audio", [])
        first = audio[0] if audio else "(no audio saved)"
        lines.append(f"| {item.get('voiceName', '')} | `{item.get('voiceId', '')}` | `{first}` |")
    md.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def generate(args: argparse.Namespace) -> int:
    base_url, api_key = atlascloud_config()
    catalog = voice_catalog(args.timeout)
    voices = voices_for_args(args, catalog)
    out_dir = Path(args.output_dir).expanduser() if args.output_dir else default_output_dir(args.task or "tts")
    outputs: list[dict[str, Any]] = []
    if args.dry_run:
        print(json.dumps({"url": f"{base_url}/model/generateAudio", "voices": voices, "bodies": [body_for(args, v) for v in voices], "auth": "<redacted>", "outputDir": str(out_dir)}, indent=2, ensure_ascii=False))
        return 0

    for voice_id in voices:
        body = body_for(args, voice_id)
        voice_name = catalog.get(voice_id, {}).get("name", voice_id)
        print(f"Generating TTS via atlascloud model={args.model} voice={voice_name} ({voice_id}) ...", file=sys.stderr)
        response = atlas_generate_audio(base_url, api_key, body, args.timeout, args.poll_interval)
        files = save_one(response, args, voice_id, catalog, out_dir, body)
        audio_paths = [p for p in files if p.suffix.lower() in AUDIO_EXTS]
        outputs.append({"voiceId": voice_id, "voiceName": voice_name, "files": [str(p) for p in files], "audio": [str(p) for p in audio_paths]})
        for path in files:
            print(path)
        if not audio_paths:
            print(f"No audio URL/base64 found for voice {voice_id}; inspect the .response.json file above.", file=sys.stderr)
    manifest = write_manifest(out_dir, args, outputs)
    print(f"Manifest: {manifest}")
    audio_paths = [p for item in outputs for p in item.get("audio", [])]
    if audio_paths and not args.no_links:
        print("\nAudio links:")
        for path in audio_paths:
            print(file_url(Path(path)))
    if args.open:
        subprocess.run(["open", *audio_paths], check=False)
    if args.reveal:
        subprocess.run(["open", str(out_dir)], check=False)
    return 0 if audio_paths else 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate text-to-speech audio via Atlas Cloud xAI TTS v1.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              tools/ai-tts.py --list-voices --language-filter en --gender female
              tools/ai-tts.py 'Hello from the repo audio test.' --voice-id ara --task smoke
              tools/ai-tts.py 'Same line for comparison.' --voice-group english-female --task english-female-voice-test
            """
        ),
    )
    parser.add_argument("text", nargs="?", help="Text to synthesize. Required unless --list-voices is used.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--voice-id", default="ara")
    parser.add_argument("--voice-group", choices=sorted(VOICE_GROUPS), help="Generate once for each voice in a curated group")
    parser.add_argument("--language", default="en", help="BCP-47 language code or auto")
    parser.add_argument("--codec", choices=["mp3", "wav", "pcm", "mulaw", "alaw"], default="mp3")
    parser.add_argument("--sample-rate", type=int, default=24000)
    parser.add_argument("--bit-rate", type=int, default=128000)
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--text-normalization", action="store_true")
    parser.add_argument("--optimize-streaming-latency", type=int, default=0)
    parser.add_argument("--param", action="append", default=[], metavar="KEY=VALUE", help="Extra provider parameter. Repeatable.")
    parser.add_argument("--task", help="Task/output slug")
    parser.add_argument("--output-dir")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--poll-interval", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--open", action="store_true", help="Open generated audio files with macOS open; never used by default")
    parser.add_argument("--reveal", action="store_true", help="Reveal output directory in Finder")
    parser.add_argument("--no-links", action="store_true")
    parser.add_argument("--list-voices", action="store_true")
    parser.add_argument("--language-filter", help="With --list-voices, filter by voice native language, e.g. en")
    parser.add_argument("--include-multilingual", action="store_true", default=True, help="When --language-filter en, include multilingual voices")
    parser.add_argument("--gender", choices=["female", "male"], help="With --list-voices, filter by gender")
    parser.add_argument("--examples", action="store_true", help="With --list-voices, include provider example URLs when available")
    args = parser.parse_args()
    if args.list_voices:
        return args
    if not args.text:
        parser.error("text is required unless --list-voices is used")
    return args


def main() -> int:
    args = parse_args()
    try:
        if args.list_voices:
            return list_voices(args)
        return generate(args)
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 - top-level CLI guard.
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
