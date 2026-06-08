---
name: generate-image
description: >-
  Generate images from text prompts using the local meta-workflow CLI wrappers and existing
  credentials. Use when the user asks to create/generate/render images, batches, variants,
  Grok Imagine, Atlas Cloud, OpenRouter image generation, DevPass, LLM Gateway, or image model advice.
---

# Generate image workflow

Use the repo-local wrappers. They read existing credentials from local machine config and never print
secrets.

## Default workflow: async jobs

Image generation can be slow. Prefer the async wrapper so the agent can keep working:

```bash
tools/ai-image-async.py submit '<prompt>' --task '<short-task-slug>'
```

For variants/copies of one prompt:

```bash
tools/ai-image-async.py submit '<prompt>' --count 4 --task '<short-task-slug>'
```

For several different prompts, pass multiple quoted prompts or create a prompt file:

```bash
tools/ai-image-async.py submit --prompt-file /tmp/image-prompts.txt --max-parallel 3 --task '<short-task-slug>'
```

The submit command returns immediately. The background worker updates `job.json` and sends an OS
notification when finished. **Do not open images automatically.** Open/reveal only when the user asks
or when it is clearly part of the task handoff; use the `image-results` skill.

## Output organization

Async outputs are repo-scoped by default:

```text
~/Pictures/ai-generated/by-repo/<repo-slug>/<YYYY-MM-DD>/<task-slug>/<job-id>/
```

Keep generated binaries out of git by default. If the user selects an image that belongs in the
project, copy only that chosen asset into a project path such as `assets/` or `docs/images/` with
normal approval/review.

Blocking `tools/ai-image.py` now also defaults to a repo-scoped `adhoc/` directory when run inside a
git repo. Use it for debugging or truly quick one-off tests.

## Provider/model routing

### Working default: OpenRouter

OpenRouter remains the safe default. The blocking wrapper defaults to `openai/gpt-5.4-image-2` unless
overridden:

```bash
tools/ai-image-async.py submit '<prompt>' --provider openrouter --image-model openai/gpt-5.4-image-2
```

Cheaper draft route:

```bash
tools/ai-image-async.py submit '<prompt>' --provider openrouter --image-model openai/gpt-5-image-mini --quality low
```

### Atlas Cloud: broad model catalog

Atlas Cloud is wired as a new provider. Store the key outside the repo (preferred macOS Keychain
setup shown in the docs/inventory note), then list image models:

```bash
tools/ai-image.py --provider atlascloud --list-models --images-only
```

Typical Atlas Cloud choices:

- General high-quality/default: `bytedance/seedream-v4`
- Fast/draft: `black-forest-labs/flux-schnell` or another listed turbo/free model
- Text/logos/graphic design: `ideogram-ai/ideogram-v3-quality` or `ideogram-ai/ideogram-v3-turbo`
- Google-style photorealism: `google/imagen4`, `google/imagen4-fast`, `google/imagen4-ultra`
- Grok Imagine through Atlas: `xai/grok-imagine-image/text-to-image`
- Qwen/image composition: `atlascloud/qwen-image/text-to-image` or listed Qwen Image 2 models

Use Atlas Cloud with:

```bash
tools/ai-image-async.py submit '<prompt>' --provider atlascloud --model bytedance/seedream-v4
```

Extra model-specific parameters can be passed through with repeatable `--param KEY=VALUE` values.
JSON values are accepted:

```bash
tools/ai-image-async.py submit '<prompt>' --provider atlascloud --model google/imagen4 --param aspect_ratio='"16:9"'
```

### DevPass / LLM Gateway

Grok Imagine is still exposed as `grok-imagine-image`, but the current coding-plan token previously
rejected image generation with `403 Image generation is not available for coding plans`:

```bash
tools/ai-image-async.py submit '<prompt>' --provider llmgateway --model grok-imagine-image
```

## Useful commands

List image-output models:

```bash
tools/ai-image.py --provider openrouter --list-models --images-only
tools/ai-image.py --provider atlascloud --list-models --images-only
tools/ai-image.py --provider atlascloud --list-models --images-only --descriptions
tools/ai-image.py --provider llmgateway --list-models --images-only
```

## Quick model guide

Use the live `--list-models --descriptions` command for exact availability. Curated defaults:

| Need | Prefer | Notes |
| --- | --- | --- |
| Safe default/general image | OpenRouter `openai/gpt-5.4-image-2` or Atlas `bytedance/seedream-v4` | Good first choice when user does not specify style/model. |
| Cheap/fast smoke test | Atlas `baidu/ERNIE-Image-Turbo/text-to-image` or OpenRouter `openai/gpt-5-image-mini` | Use for workflow testing and drafts. |
| Many variants quickly | Flux Schnell/Turbo/Z-Image Turbo family | Best for iteration; choose higher quality later. |
| Logos/posters/text in image | Ideogram v3, Qwen Image, Seedream 4.5/5 | Better typography/layout than generic photoreal models. |
| Photorealism/product shots | Imagen 4/Ultra, GPT Image, Flux Pro | Higher quality; confirm before large batches. |
| Natural-language image edits | GPT Image edit, Qwen Image edit, Flux Kontext, Seedream edit | Requires image-input/upload tooling; text-to-image wrapper is only partially sufficient today. |
| Grok Imagine | Atlas `xai/grok-imagine-image/text-to-image` | Prefer Atlas route over current DevPass coding plan. |


Common options:

```bash
--quality high
--size 1024x1024
--aspect-ratio 16:9
--output-format png
--max-parallel 2
--count 4
```

Use async `--dry-run` to inspect the job plan without launching, or `--request-dry-run` to launch a
background worker that passes `--dry-run` to each provider request.

## Guardrails

- Do not print API keys, tokens, cookies, or raw auth config.
- Image generation can incur real charges. If the prompt looks expensive, broad, or repeated,
  confirm before running multiple generations.
- Never default to `--open` or automatic image display in chat-driven workflows.
- Save response JSON and metadata next to generated images so prompts/models are traceable.
- If no image is extracted, point the user to the saved `.response.json`, item stderr, and job JSON.
