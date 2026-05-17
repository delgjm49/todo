# Plan: Packaging Assets and Windows Build Config (TICKET-064)

## Overview
Add a valid generated placeholder app icon and complete the Tauri window/bundle metadata needed for a properly identified Windows desktop build. This task is config/assets-only: do not modify `src/`, `src-tauri/src/`, app behavior, tests, storage, or unrelated docs.

## Current State / Baseline
- Dispatch channel: `agents/channels/023-packaging-assets/` (spool directory).
- Latest message re-read from disk: `agents/channels/023-packaging-assets/messages/001-main-to-plan.md`, addressed to Plan.
- `src-tauri/tauri.conf.json` currently has:
  - top-level `identifier`: `"com.todo.app"`
  - window title `"Todo"`, size `1280x800`, min size `1280x800`, `resizable: true`
  - bundle `active: true`, `targets: ["msi"]`, `icon: ["icons/icon.ico"]`
- `src-tauri/icons/` currently exists and contains `.gitkeep` and `icon.ico`; it does not contain `icon.png`.
- Baseline verification before implementation passed:
  - `npm run typecheck && npm run build`

## Prerequisites
- Node/npm dependencies are already installed.
- Tauri/Rust toolchain must be available for the final config validation command.
- Use the actual shell available in the environment. The icon-generation command below is shown for bash/zsh; in PowerShell, pipe the same JavaScript body to `node` with a here-string (`@' ... '@ | node`) instead of creating a committed helper script.

## Files to Create/Modify
| Action | Path | Description |
|--------|------|-------------|
| Create | `src-tauri/icons/icon.png` | Generated 1024×1024 PNG placeholder icon that Tauri can process. |
| Modify | `src-tauri/tauri.conf.json` | Set Tauri identifier, window metadata, and bundle metadata/icon reference. |
| Create | `agents/artifacts/023-packaging-assets-complete.md` | Dev completion artifact. |
| Modify | `docs/SESSIONS.md` | Dev session close entry. |
| Create | `agents/channels/023-packaging-assets/messages/003-dev-to-review.md` | Exactly one next spool message from Dev to Review. |

## Implementation Steps

### Step 1: Confirm workspace and current files
- Re-read:
  - `agents/channels/023-packaging-assets/messages/002-plan-to-dev.md`
  - `agents/artifacts/023-packaging-assets-dispatch.md`
  - `agents/artifacts/023-packaging-assets-plan.md`
  - `src-tauri/tauri.conf.json`
- Confirm only `001-main-to-plan.md` and `002-plan-to-dev.md` exist in `agents/channels/023-packaging-assets/messages/` before appending the Dev message.
- Confirm `src-tauri/icons/` exists.
- **Verify**: inspection matches the Current State section above, aside from this plan/message/session artifact work.

### Step 2: Generate `src-tauri/icons/icon.png`
- Create `src-tauri/icons/icon.png` as a valid 1024×1024 PNG using only Node built-ins (`fs`, `zlib`) so no external image tool is required.
- Do not add a committed script file. Run a one-off command from the repo root. For bash/zsh:

```bash
node <<'NODE'
const fs = require('fs');
const zlib = require('zlib');

const width = 1024;
const height = 1024;
const raw = Buffer.alloc((width * 4 + 1) * height);

for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1);
  raw[row] = 0; // PNG filter type: none
  for (let x = 0; x < width; x += 1) {
    const offset = row + 1 + x * 4;

    // Simple v1 placeholder: dark base, blue tile, white "T" mark.
    let r = 17;
    let g = 24;
    let b = 39;
    let a = 255;

    const inTile = x >= 112 && x <= 912 && y >= 112 && y <= 912;
    const inTopBar = x >= 300 && x <= 724 && y >= 270 && y <= 370;
    const inStem = x >= 462 && x <= 562 && y >= 370 && y <= 760;

    if (inTile) {
      r = 37;
      g = 99;
      b = 235;
    }
    if (inTopBar || inStem) {
      r = 248;
      g = 250;
      b = 252;
    }

    raw[offset] = r;
    raw[offset + 1] = g;
    raw[offset + 2] = b;
    raw[offset + 3] = a;
  }
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // truecolor with alpha
ihdr[10] = 0; // compression method
ihdr[11] = 0; // filter method
ihdr[12] = 0; // interlace method

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync('src-tauri/icons', { recursive: true });
fs.writeFileSync('src-tauri/icons/icon.png', png);
console.log(`Wrote src-tauri/icons/icon.png (${width}x${height}, ${png.length} bytes)`);
NODE
```

- Keep the existing `src-tauri/icons/icon.ico` unless there is a clear validation reason to change it. The required bundle icon for this dispatch is `icons/icon.png`.
- **Verify** with a Node check:

```bash
node <<'NODE'
const fs = require('fs');
const png = fs.readFileSync('src-tauri/icons/icon.png');
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!png.subarray(0, 8).equals(signature)) throw new Error('icon.png is not a PNG');
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 1024 || height !== 1024) throw new Error(`Unexpected dimensions: ${width}x${height}`);
console.log(`icon.png OK: ${width}x${height}`);
NODE
```

### Step 3: Update `src-tauri/tauri.conf.json`
- Update the existing top-level Tauri v2 `identifier` field to:
  - `"com.todoapp.desktop"`
- Do **not** create `app.identifier`; the current file and Tauri v2 schema use top-level `identifier`.
- In `app.windows[0]`, set/add exactly these values:
  - `"title": "Todo App"`
  - `"width": 1200`
  - `"height": 800`
  - `"minWidth": 800`
  - `"minHeight": 600`
  - `"center": true`
  - `"decorations": true`
- Preserve `"resizable": true` unless Tauri config validation reports a schema problem.
- In `bundle`, set/add exactly these values:
  - `"publisher": "Todo App"`
  - `"copyright": "Copyright (c) 2026. All rights reserved."`
  - `"icon": ["icons/icon.png"]`
- Preserve existing `bundle.active: true` and `bundle.targets: ["msi"]` unless validation proves they must change.
- Do not change `productName`, `version`, `build`, capabilities, Rust source, or frontend source.
- **Verify**: `src-tauri/tauri.conf.json` remains valid JSON and contains only the intended config changes.

### Step 4: Run required verification
Run these commands from the repo root and record each result in the complete artifact using the `agents/CLOSING.md` verification reporting format:

1. `npm run typecheck`
2. `npm run build`
3. `npm run tauri:build -- --no-bundle --ci`

Notes:
- The actual package script is `tauri:build` (`npm exec tauri -- build`).
- Tauri CLI help in this repo exposes `--no-bundle`; do not use `--bundles none` because `none` is not a listed bundle value.
- `npm run tauri:build -- --no-bundle --ci` still runs the Tauri build/config path while skipping installer bundling, which is the appropriate config/build validation for this dispatch.
- If the Tauri build fails for an unrelated local toolchain/platform issue, capture the exact failure surface and classify it clearly. Do not claim success unless the command actually passes.

### Step 5: Create the Dev complete artifact
- Write `agents/artifacts/023-packaging-assets-complete.md` following `agents/ARTIFACTS.md`.
- Include:
  - summary of generated icon/config changes
  - files changed
  - deviations from this plan, if any
  - open questions, if any
  - verification reports for all required commands
  - known issues, if any

### Step 6: Close through the spool channel
- Append exactly one new message file: `agents/channels/023-packaging-assets/messages/003-dev-to-review.md`.
- Message must be `Dev → Review` with `State = ready-for-review`.
- Include reads for the dispatch, plan, complete artifact, `src-tauri/tauri.conf.json`, and `src-tauri/icons/icon.png`.
- Update `docs/SESSIONS.md` with a Dev entry.
- Do not commit; Main handles git operations.

## Data / Storage Changes
None. This task does not change app data models, local JSON storage format, migrations, or persistence behavior.

## UI Specifications
- No React UI changes.
- Native Tauri window launch metadata changes only:
  - title: `Todo App`
  - default size: `1200 × 800`
  - minimum size: `800 × 600`
  - centered on launch
  - native decorations enabled

## Spool-Format Guidance for Workers
- This is a spool-format channel: messages are individual immutable files under `agents/channels/023-packaging-assets/messages/`.
- Pickup path is the directory with trailing slash: `agents/channels/023-packaging-assets/`.
- Each agent creates exactly one new message file with the next sequential number.
- No agent may edit, delete, rename, or replace any existing `messages/*.md` file.
- Route for this dispatch: `Main → Plan → Dev → Review → Main` unless Review finds a required fix.

## Acceptance Criteria
- [ ] `src-tauri/icons/icon.png` exists and is a valid 1024×1024 PNG.
- [ ] `src-tauri/tauri.conf.json` top-level `identifier` is `"com.todoapp.desktop"`.
- [ ] `app.windows[0]` contains `title`, `width`, `height`, `minWidth`, `minHeight`, `center`, and `decorations` with the exact values listed above.
- [ ] `bundle.publisher` is `"Todo App"`.
- [ ] `bundle.copyright` is `"Copyright (c) 2026. All rights reserved."`.
- [ ] `bundle.icon` is `["icons/icon.png"]`.
- [ ] No files under `src/` or `src-tauri/src/` are modified.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `npm run tauri:build -- --no-bundle --ci` passes, or any failure is explicitly documented as unrelated local tooling/platform state with exact output.
- [ ] Dev complete artifact, session entry, and exactly one Dev → Review channel message are created.

## Estimated Complexity
- Small/Medium.
- Expected implementation files: 2 app/config files (`src-tauri/icons/icon.png`, `src-tauri/tauri.conf.json`) plus required agent artifact/session/channel files.
