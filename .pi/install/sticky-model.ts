/**
 * Sticky Model — preserve the current session's model across `/new` only.
 *
 * Pi already persists explicit model and thinking-level changes to settings.json.
 * This extension intentionally does not add another global "last used" policy.
 *
 * The one behavior it adds is narrower:
 *   When this session runs `/new`, the replacement session should start with the
 *   same provider/model/thinking level that was active in this session, even if
 *   another terminal changed the global defaults meanwhile.
 *
 * Implementation notes:
 * - Pi resolves a new blank session's initial model from settings.json before
 *   the new extension runtime receives `session_start`.
 * - On `session_shutdown` for reason `new`, we temporarily seed settings.json
 *   with this session's active provider/model/thinking and write a small state
 *   file containing the previous defaults.
 * - On the replacement runtime's `session_start` for reason `new`, we restore
 *   the previous defaults, but only if settings still match the temporary values.
 *   That avoids clobbering another terminal if it changed settings during the
 *   small handoff window.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

interface PiSettings {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: string;
  [key: string]: unknown;
}

interface NewSessionHandoffState {
  pid: number;
  writtenAt: number;
  desiredProvider: string;
  desiredModel: string;
  desiredThinkingLevel: string;
  previousProvider?: string;
  previousModel?: string;
  previousThinkingLevel?: string;
}

const STATE_MAX_AGE_MS = 5 * 60 * 1000;

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function resolveAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR
    ? expandHome(process.env.PI_CODING_AGENT_DIR)
    : path.join(os.homedir(), ".pi", "agent");
}

function resolveSettingsPath(): string {
  return path.join(resolveAgentDir(), "settings.json");
}

function resolveStatePath(): string {
  return path.join(resolveAgentDir(), "sticky-model-new-session.json");
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    }
  } catch {
    // Unreadable or malformed → use fallback.
  }
  return fallback;
}

function writeJson(filePath: string, value: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  fs.renameSync(tmp, filePath);
}

function deleteIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Missing or already removed.
  }
}

function setOrDelete(settings: PiSettings, key: keyof PiSettings, value: string | undefined): void {
  if (value === undefined) delete settings[key];
  else settings[key] = value;
}

export default function (pi: ExtensionAPI) {
  const settingsPath = resolveSettingsPath();
  const statePath = resolveStatePath();

  pi.on("session_shutdown", async (event, ctx) => {
    if (event.reason !== "new") return;
    if (!ctx.model) return;

    const desiredThinkingLevel = pi.getThinkingLevel();
    const settings = readJson<PiSettings>(settingsPath, {});
    const state: NewSessionHandoffState = {
      pid: process.pid,
      writtenAt: Date.now(),
      desiredProvider: ctx.model.provider,
      desiredModel: ctx.model.id,
      desiredThinkingLevel,
      previousProvider: settings.defaultProvider,
      previousModel: settings.defaultModel,
      previousThinkingLevel: settings.defaultThinkingLevel,
    };

    settings.defaultProvider = state.desiredProvider;
    settings.defaultModel = state.desiredModel;
    settings.defaultThinkingLevel = state.desiredThinkingLevel;

    try {
      writeJson(statePath, state);
      writeJson(settingsPath, settings);
    } catch (error) {
      console.error(`[sticky-model] Failed to seed /new model defaults: ${error}`);
    }
  });

  pi.on("session_start", async (event) => {
    if (event.reason !== "new") return;

    const state = readJson<NewSessionHandoffState | null>(statePath, null);
    if (!state) return;

    deleteIfExists(statePath);

    if (Date.now() - state.writtenAt > STATE_MAX_AGE_MS) return;

    const settings = readJson<PiSettings>(settingsPath, {});
    const stillOurTemporaryDefaults =
      settings.defaultProvider === state.desiredProvider &&
      settings.defaultModel === state.desiredModel &&
      settings.defaultThinkingLevel === state.desiredThinkingLevel;

    if (!stillOurTemporaryDefaults) return;

    setOrDelete(settings, "defaultProvider", state.previousProvider);
    setOrDelete(settings, "defaultModel", state.previousModel);
    setOrDelete(settings, "defaultThinkingLevel", state.previousThinkingLevel);

    try {
      writeJson(settingsPath, settings);
    } catch (error) {
      console.error(`[sticky-model] Failed to restore pre-/new model defaults: ${error}`);
    }
  });
}
