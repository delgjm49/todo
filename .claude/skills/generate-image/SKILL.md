---
name: generate-image
description: >-
  Generate images from text prompts using the local meta-workflow CLI wrapper and existing
  Pi credentials. Use when the user asks to create/generate/render an image, especially with
  Grok Imagine, OpenRouter image generation, DevPass, LLM Gateway, or a CLI image workflow.
---

# Generate image workflow

Use the repo-local wrapper; it reads existing credentials from `~/.pi/agent/models.json` and
`~/.pi/agent/auth.json` and never prints secrets.

## Default routing

- Use **OpenRouter** as the working default. The wrapper defaults to the higher-quality
  `openai/gpt-5.4-image-2` image model unless the user asks for another model:

  ```bash
  tools/ai-image.py '<prompt>' --image-model openai/gpt-5.4-image-2
  ```

- For **Grok Imagine** requests, DevPass / LLM Gateway exposes `grok-imagine-image`, but the current
  coding-plan token may reject image generation unless the dashboard enables access to all models:

  ```bash
  tools/ai-image.py '<prompt>' --provider llmgateway --model grok-imagine-image
  ```

- For explicit OpenRouter server-tool image generation, use the wrapper's default Responses API path:

  ```bash
  tools/ai-image.py '<prompt>' \
    --provider openrouter \
    --model openai/gpt-5.5 \
    --image-model openai/gpt-5.4-image-2 \
    --open
  ```

  The legacy Chat Completions path is available with `--openrouter-api chat`, but the Responses
  API is preferred because it returns the image tool output directly.

- Use `--dry-run` first when changing model/parameter combinations.
- Add `--open` by default in chat-driven workflows so the generated image appears in the macOS
  picture viewer immediately, unless the user asks not to open it.
- The wrapper prints `file://` links for generated images by default; add `--osc8-links` for OSC 8
  terminal hyperlinks or `--no-links` to suppress links.
- To experiment with inline terminal display in Ghostty, add `--terminal-preview`. This emits Kitty
  graphics protocol escapes and may only work when the harness/TUI passes those escapes through.
- Default output directory is `~/Pictures/ai-generated/YYYY-MM-DD/`.

## Useful commands

List image-output models:

```bash
tools/ai-image.py --provider llmgateway --list-models --images-only
tools/ai-image.py --provider openrouter --list-models --images-only
```

Common options:

```bash
--quality high
--size 1024x1024
--aspect-ratio 16:9
--output-format png
--output-dir ~/Pictures/ai-generated/test
```

## Guardrails

- Do not print API keys, tokens, cookies, or raw auth config.
- Image generation can incur real charges. If the prompt looks expensive, broad, or repeated,
  confirm before running multiple generations.
- Save both the response JSON and metadata next to generated images so prompts/models are traceable.
- If no image is extracted, point the user to the saved `.response.json` and inspect the response
  shape before retrying.
