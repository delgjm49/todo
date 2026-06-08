---
name: generate-tts
description: >-
  Generate text-to-speech audio using Atlas Cloud xAI TTS credentials. Use when the user asks for
  TTS, narration, voiceover, audio samples, voice comparison, voice lists, or custom voice guidance.
---

# Generate TTS workflow

Use the repo-local wrapper. It reads the Atlas Cloud API key from local machine config / Keychain and
never prints secrets.

## Default behavior

Generate MP3 audio without autoplay:

```bash
tools/ai-tts.py '<text>' --voice-id ara --task '<short-task-slug>'
```

Outputs are repo-scoped by default:

```text
~/Music/ai-generated/by-repo/<repo-slug>/<YYYY-MM-DD>/<task-slug>/<batch-id>/
```

The wrapper saves:

- `*.mp3` / `*.wav` / codec-specific audio
- `*.response.json`
- `*.meta.json`
- `tts-manifest.json`
- `README.md`

Do not autoplay audio by default. Use `--open` only when the user asks to hear it immediately, or
`--reveal` to open the containing directory in Finder.

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

Generate a comparison batch with the same text:

```bash
tools/ai-tts.py 'Hello, this is a short voice comparison test.' \
  --voice-group english-female \
  --task english-female-voice-test
```

## Common options

```bash
--codec mp3             # mp3, wav, pcm, mulaw, alaw
--sample-rate 24000     # 8000, 16000, 22050, 24000, 44100, 48000
--bit-rate 128000       # MP3 only
--speed 1.0             # 0.7 to 1.5
--text-normalization
--language en           # or auto
--param KEY=VALUE       # provider-specific passthrough
```

Inline speech tags are supported by the model, for example `[pause]`, `[laugh]`, `<whisper>...</whisper>`, `<slow>...</slow>`, and `<emphasis>...</emphasis>`.

## Custom voice / voice cloning

Atlas' xAI TTS readme says custom voice cloning can produce a custom `voice_id` from about a minute
of reference audio. This wrapper can synthesize with any `--voice-id`, including a custom voice ID
once created, but it does **not yet create cloned voices**.

Guardrails for custom voices:

- Only clone voices with explicit consent/rights.
- Do not use celebrity/public-figure voices unless the user owns rights/authorization.
- Keep reference audio and generated audio outside git unless intentionally adding a selected asset.
