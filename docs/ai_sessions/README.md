# AI Session Workflow

## Purpose

This folder holds the lightweight continuity artifacts for stateless AI sessions on this project.

## Files

### `HANDOFF.md`

Current baton-pass document for the next agent.

Read this first.

### `STATUS.md`

Stable summary of:

- implementation progress
- CI/build status
- current checkpoint
- known constraints

### `WORKLOG.md`

Append-only session log of meaningful decisions and progress.

## Usage

At the start of a session:

1. Read `HANDOFF.md`
2. Read `STATUS.md`
3. Read the relevant planning docs under `docs/`

At the end of a session:

1. Update `HANDOFF.md`
2. Update `STATUS.md` if project state changed
3. Append a short entry to `WORKLOG.md`

## Scope

These files are not meant to replace the main planning artifacts.
They exist to make session-to-session continuation predictable and low-friction.
