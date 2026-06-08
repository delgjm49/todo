---
name: generate-tts
description: >-
  Generate text-to-speech audio using Atlas Cloud xAI TTS credentials. Use when the user asks for
  TTS, narration, voiceover, audio samples, voice comparison, voice lists, long narration, async TTS,
  or custom voice guidance.
---

# Generate TTS workflow

Use the repo-local wrappers. They read the Atlas Cloud API key from local machine config / Keychain
and never print secrets.

## Default workflow: async jobs

TTS can be quick for short clips but can still block on long narration or batches. Prefer async:

```bash
tools/ai-tts-async.py submit '<text>' --task '<short-task-slug>'
```

Defaults:

- model: `xai/tts-v1`
- voice: `ara`
- language: `en`
- codec: `mp3`
- no autoplay / no auto-open

Generate multiple texts:

```bash
tools/ai-tts-async.py submit --text 'First line.' --text 'Second line.' --task '<short-task-slug>'
```

Generate a long narration from a file:

```bash
tools/ai-tts-async.py submit --text-file /tmp/narration.txt --task '<short-task-slug>'
```

Generate each non-comment line in a text file as a separate item:

```bash
tools/ai-tts-async.py submit --text-file /tmp/lines.txt --linewise --task '<short-task-slug>'
```

Generate a same-text voice comparison batch:

```bash
tools/ai-tts-async.py submit 'Hello, this is a short voice comparison test.' \
  --voice-group english-female \
  --task english-female-voice-test
```

The submit command returns immediately. The background worker updates `job.json` and sends an OS
notification when finished. **Do not open audio automatically.** Open/reveal only when the user asks
or when it is clearly part of the task handoff; use the `tts-results` skill.

## Output organization

Async outputs are repo-scoped by default:

```text
~/Music/ai-generated/by-repo/<repo-slug>/<YYYY-MM-DD>/<task-slug>/<job-id>/
```

Each job saves:

- `job.json`
- `worker.log`
- job `README.md`
- per-item audio + `*.response.json` / `*.meta.json` / `run.stdout` / `run.stderr`

Keep generated audio out of git by default. If the user selects an audio file for the project, copy
only that selected asset into a project path with normal approval/review.

## Voice discovery

List English-speaking female voices:

```bash
tools/ai-tts.py --list-voices --language-filter en --gender female --examples
```

Current English-speaking female set:

| Voice | ID | Notes |
| --- | --- | --- |
| Ara | `ara` | multilingual female; warm/conversational; wrapper default |
| Eve | `eve` | multilingual female; energetic/upbeat |
| Grace | `f8cf5c2c78d4` | English female, young |
| Claire | `79f3a8b96d43` | English female, middle-aged |

## Common options

```bash
--voice-id ara          # repeatable in async wrapper
--voice-group english-female
--codec mp3             # mp3, wav, pcm, mulaw, alaw
--sample-rate 24000     # 8000, 16000, 22050, 24000, 44100, 48000
--bit-rate 128000       # MP3 only
--speed 1.0             # 0.7 to 1.5
--text-normalization
--language en           # or auto
--max-parallel 2
--param KEY=VALUE       # provider-specific passthrough
```

Inline speech tags are supported by the model, for example `[pause]`, `[laugh]`,
`<whisper>...</whisper>`, `<slow>...</slow>`, and `<emphasis>...</emphasis>`.

## Blocking primitive

Use `tools/ai-tts.py` for quick debugging or when synchronous behavior is explicitly desired:

```bash
tools/ai-tts.py '<text>' --voice-id ara --task '<short-task-slug>'
```

## Custom voice / voice cloning

Atlas' xAI TTS readme says custom voice cloning can produce a custom `voice_id` from about a minute
of reference audio. These wrappers can synthesize with any `--voice-id`, including a custom voice ID
once created, but they do **not yet create cloned voices**.

Guardrails for custom voices:

- Only clone voices with explicit consent/rights.
- Do not use celebrity/public-figure voices unless the user owns rights/authorization.
- Keep reference audio and generated audio outside git unless intentionally adding a selected asset.
