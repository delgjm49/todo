#!/usr/bin/env python3
"""
sync_agent_docs.py — sync shared content from CLAUDE.md into AGENTS.md and GEMINI.md.

CLAUDE.md is the canonical source of truth. Content between <!-- SHARED-START --> and
<!-- SHARED-END --> in CLAUDE.md is synced into the matching blocks in AGENTS.md and
GEMINI.md, preserving each file's agent-specific header section.

Usage:
    python3 tools/sync_agent_docs.py [--check | --apply] [repo_path]

    --check     Report drift without modifying files (default)
    --apply     Write synced content to target files
    repo_path   Path to the repo root (default: parent of this script's directory)

Examples:
    python3 tools/sync_agent_docs.py --check
    python3 tools/sync_agent_docs.py --apply
    python3 tools/sync_agent_docs.py --apply ~/Developer/todo
    python3 tools/sync_agent_docs.py --check ~/Developer/balancetrack
"""

import re
import sys
from pathlib import Path

SHARED_START = "<!-- SHARED-START -->"
SHARED_END = "<!-- SHARED-END -->"
SYNC_NOTE = "<!-- Synced from CLAUDE.md — run tools/sync_agent_docs.py --apply to update -->"
TARGETS = ["AGENTS.md", "GEMINI.md"]

_BLOCK_RE = re.compile(
    r"(<!-- SHARED-START -->)(.*?)(<!-- SHARED-END -->)",
    re.DOTALL,
)


def extract_inner(text: str) -> str | None:
    """Return content between SHARED-START and SHARED-END, or None if markers absent."""
    m = _BLOCK_RE.search(text)
    return m.group(2) if m else None


def replace_inner(text: str, new_inner: str) -> tuple[str, bool]:
    """Replace inner content of SHARED block. Returns (new_text, success)."""
    result, n = _BLOCK_RE.subn(
        f"{SHARED_START}{new_inner}{SHARED_END}",
        text,
        count=1,
    )
    return result, n > 0


def resolve_repo(args: list[str]) -> Path:
    for a in args:
        if not a.startswith("--"):
            return Path(a).expanduser().resolve()
    # Default: parent of the directory containing this script.
    # Works whether run from repo root (tools/sync_agent_docs.py) or the tools/ dir.
    return Path(__file__).resolve().parent.parent


def main() -> None:
    args = sys.argv[1:]
    apply = "--apply" in args
    repo = resolve_repo(args)

    claude_path = repo / "CLAUDE.md"
    if not claude_path.exists():
        print(f"ERROR: {claude_path} not found", file=sys.stderr)
        sys.exit(1)

    source_inner = extract_inner(claude_path.read_text(encoding="utf-8"))
    if source_inner is None:
        print(
            f"ERROR: No SHARED-START/SHARED-END block found in {claude_path}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Desired inner content for target files: sync note + shared content from CLAUDE.md.
    desired_inner = f"\n{SYNC_NOTE}\n{source_inner.lstrip(chr(10))}"

    all_ok = True
    for name in TARGETS:
        path = repo / name
        if not path.exists():
            print(f"SKIP  {name} (not found)")
            continue

        text = path.read_text(encoding="utf-8")
        current_inner = extract_inner(text)

        if current_inner is None:
            print(f"ERROR {name}: no SHARED-START/SHARED-END block found")
            all_ok = False
            continue

        if current_inner == desired_inner:
            print(f"OK    {name}")
        elif apply:
            new_text, ok = replace_inner(text, desired_inner)
            if ok:
                path.write_text(new_text, encoding="utf-8")
                print(f"SYNC  {name}")
            else:
                print(f"ERROR {name}: replacement failed")
                all_ok = False
        else:
            print(f"DRIFT {name}")
            all_ok = False

    if not apply and not all_ok:
        print("\nRun with --apply to update out-of-sync files.")
        sys.exit(1)


if __name__ == "__main__":
    main()
