#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";

const DEFAULT_ENDPOINT = "https://api.tinyapi.org";
const DEFAULT_MODELS = {
  claude: "claude-opus-4-6",
  codex: "gpt-5.5",
  gemini: "gemini-2.5-pro",
  openai: "claude-opus-4-6",
};

const home = os.homedir();
const tinyDir = path.join(home, ".tinytoken");
const stateFile = path.join(tinyDir, "setup-state.json");
const backupRoot = path.join(tinyDir, "backups");
const isWindows = process.platform === "win32";

const colors = {
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function say(text = "") {
  console.log(text);
}

function ok(text) {
  say(`${colors.green}✓${colors.reset} ${text}`);
}

function warn(text) {
  say(`${colors.yellow}!${colors.reset} ${text}`);
}

function fail(text) {
  say(`${colors.red}✗${colors.reset} ${text}`);
}

function ask(question, fallback = "") {
  const label = fallback ? `${question} (${fallback}): ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(label, (answer) => {
      const value = answer.trim();
      resolve(value || fallback);
    });
  });
}

async function askYesNo(question, fallback = true) {
  const def = fallback ? "Y/n" : "y/N";
  const answer = String(await ask(`${question} [${def}]`, "")).toLowerCase();
  if (!answer) return fallback;
  return answer === "y" || answer === "yes";
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value);
}

function maskKey(key) {
  if (!key) return "";
  const clean = normalizeKey(key, false);
  if (!clean) return "";
  return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
}

function normalizeKey(key, throwOnError = true) {
  let value = String(key || "")
    .trim()
    .replace(/\s+/g, "");
  if (value.startsWith("sk-")) value = value.slice(3);
  if (!/^[0-9A-Za-z]{48}$/.test(value)) {
    if (throwOnError) {
      throw new Error("API key must be sk- followed by 48 letters/numbers.");
    }
    return "";
  }
  return `sk-${value}`;
}

function normalizeEndpoint(endpoint) {
  const raw = String(endpoint || DEFAULT_ENDPOINT).trim();
  const withProtocol = /^https?:\/\//i.test(raw)
    ? raw
    : /^(127\.0\.0\.1|localhost)(:[0-9]+)?(\/|$)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error(
      "Endpoint must be a valid URL, for example https://api.tinyapi.org.",
    );
  }

  const isTinyApi =
    parsed.protocol === "https:" &&
    /(^|\.)tinyapi\.org$/i.test(parsed.hostname);
  const isLocal =
    parsed.protocol === "http:" &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  if (!isTinyApi && !isLocal) {
    throw new Error(
      "Endpoint must be https://*.tinyapi.org or local http://127.0.0.1:PORT / http://localhost:PORT.",
    );
  }

  const origin = parsed.origin.replace(/\/+$/, "");
  const pathOnly = parsed.pathname.replace(/\/+$/, "");
  const knownApiPaths = new Set([
    "",
    "/v1",
    "/v1/models",
    "/v1/messages",
    "/v1/responses",
    "/v1/chat/completions",
    "/v1beta",
    "/v1beta/models",
  ]);
  if (!knownApiPaths.has(pathOnly)) {
    warn(`Using ${origin}; ignored pasted endpoint path ${parsed.pathname}.`);
  }
  if (parsed.search || parsed.hash) {
    warn(`Using ${origin}; ignored query/hash from pasted endpoint.`);
  }
  return origin;
}

async function askEndpoint(label, fallbackEndpoint) {
  while (true) {
    const value = await ask(
      `${label} (Enter ใช้ค่าในวงเล็บ / paste URL ได้)`,
      fallbackEndpoint,
    );
    if (/^[1-9]$/.test(String(value).trim())) {
      warn(
        "ตอนนี้เป็นช่อง Endpoint ไม่ใช่เมนูหลัก ถ้าจะใช้ค่าเดิมให้กด Enter หรือวาง URL endpoint",
      );
      continue;
    }

    try {
      return normalizeEndpoint(value);
    } catch (error) {
      warn(error.message);
      warn(
        "ตัวอย่างที่ถูกต้อง: https://api.tinyapi.org หรือ http://127.0.0.1:3000",
      );
    }
  }
}

function showThaiGuide() {
  say(`${colors.bold}วิธีใช้สั้น ๆ${colors.reset}`);
  say("  เลือกเมนูด้านล่างก่อน แล้วทำตามคำถามทีละช่อง");
  say(
    "  Endpoint: กด Enter เพื่อใช้ค่าเดิม หรือวาง URL เช่น http://127.0.0.1:3000",
  );
  say("  API key: วาง key ที่ขึ้นต้นด้วย sk-");
  say("  Model: กด Enter เพื่อใช้ค่าเดิม หรือพิมพ์ชื่อ model เอง");
  say("  ระบบจะ backup config เดิมก่อนแก้ไฟล์เสมอ");
}

function loadState() {
  const state = readJson(stateFile, {});
  return {
    endpoint:
      state.endpoint || process.env.TINYTOKEN_ENDPOINT || DEFAULT_ENDPOINT,
    models: { ...DEFAULT_MODELS, ...(state.models || {}) },
  };
}

function saveState(state) {
  ensureDir(tinyDir);
  writeJson(stateFile, {
    endpoint: state.endpoint,
    models: state.models,
    savedAt: new Date().toISOString(),
  });
}

function detectKey() {
  const argKey = process.argv.slice(2).find((arg) => normalizeKey(arg, false));
  const argFull = normalizeKey(argKey, false);
  if (argFull) return argFull;

  const envKey =
    process.env.TINYTOKEN_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY;
  const envFull = normalizeKey(envKey, false);
  if (envFull) return envFull;

  const codexAuth = readJson(path.join(home, ".codex", "auth.json"), {});
  const codexFull = normalizeKey(codexAuth.OPENAI_API_KEY, false);
  if (codexFull) return codexFull;

  const claudeSettings = readJson(
    path.join(home, ".claude", "settings.json"),
    {},
  );
  const claudeFull = normalizeKey(
    claudeSettings?.env?.ANTHROPIC_API_KEY,
    false,
  );
  if (claudeFull) return claudeFull;

  return "";
}

async function collectBasics(toolName, modelKey) {
  const state = loadState();
  const endpoint = await askEndpoint(
    "Endpoint / Base URL",
    process.env.TINYTOKEN_ENDPOINT || state.endpoint,
  );
  const detected = detectKey();
  const enteredKey = await ask(
    detected ? `API key (Enter to use ${maskKey(detected)})` : "API key",
    "",
  );
  const key = normalizeKey(enteredKey || detected);
  const model = await ask(
    "Model name",
    state.models[modelKey] || DEFAULT_MODELS[modelKey],
  );
  state.endpoint = endpoint;
  state.models[modelKey] = model;
  saveState(state);
  say("");
  ok(`${toolName} values ready`);
  say(`Endpoint: ${endpoint}`);
  say(`API key:  ${maskKey(key)}`);
  say(`Model:    ${model}`);
  say("");
  return { endpoint, key, model, state };
}

function makeBackup(files, label) {
  ensureDir(backupRoot);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(backupRoot, `${stamp}-${label}`);
  const fileDir = path.join(dir, "files");
  ensureDir(fileDir);
  const manifest = [];

  for (const original of files) {
    const record = { original, existed: fs.existsSync(original), backup: null };
    if (record.existed) {
      const backup = path.join(fileDir, `${manifest.length}`);
      fs.copyFileSync(original, backup);
      record.backup = backup;
    }
    manifest.push(record);
  }

  writeJson(path.join(dir, "manifest.json"), {
    label,
    createdAt: new Date().toISOString(),
    files: manifest,
  });
  ok(`backup created: ${dir}`);
  return dir;
}

function restoreBackup() {
  if (!fs.existsSync(backupRoot)) {
    warn("No backups found.");
    return;
  }
  const backups = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (!backups.length) {
    warn("No backups found.");
    return;
  }

  say("\nAvailable backups:");
  backups.forEach((name, index) => say(`  ${index + 1}. ${name}`));
  return ask("Choose backup number", "1").then((answer) => {
    const index = Number(answer) - 1;
    const selected = backups[index];
    if (!selected) {
      warn("Invalid backup selection.");
      return;
    }
    const manifestPath = path.join(backupRoot, selected, "manifest.json");
    const manifest = readJson(manifestPath, null);
    if (!manifest?.files) {
      warn("Backup manifest is missing or invalid.");
      return;
    }
    for (const file of manifest.files) {
      ensureDir(path.dirname(file.original));
      if (file.existed && file.backup && fs.existsSync(file.backup)) {
        fs.copyFileSync(file.backup, file.original);
        ok(`restored ${file.original}`);
      } else if (!file.existed && fs.existsSync(file.original)) {
        fs.rmSync(file.original, { force: true });
        ok(`removed ${file.original}`);
      }
    }
  });
}

function npmInstall(pkg) {
  const npm = isWindows ? "npm.cmd" : "npm";
  const result = spawnSync(npm, ["install", "-g", pkg], { stdio: "inherit" });
  if (result.status !== 0) {
    warn(`npm install failed for ${pkg}. You can install it manually later.`);
    return false;
  }
  return true;
}

async function maybeInstall(pkg, name) {
  const shouldInstall = await askYesNo(
    `Install ${name} globally with npm?`,
    true,
  );
  if (!shouldInstall) return;
  npmInstall(pkg);
}

function persistEnv(vars) {
  if (isWindows) {
    const ps = process.env.SystemRoot
      ? path.join(
          process.env.SystemRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        )
      : "powershell.exe";
    for (const [key, value] of Object.entries(vars)) {
      spawnSync(
        ps,
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `[Environment]::SetEnvironmentVariable(${JSON.stringify(key)}, ${JSON.stringify(value)}, 'User')`,
        ],
        { stdio: "ignore" },
      );
    }
    ok("saved user environment variables. Open a new terminal to use them.");
    return;
  }

  const shell = path.basename(process.env.SHELL || "bash");
  let rc = path.join(home, ".bashrc");
  if (shell === "zsh") rc = path.join(home, ".zshrc");
  if (shell === "bash" && process.platform === "darwin")
    rc = path.join(home, ".bash_profile");

  const mark = "# >>> TinyToken >>>";
  const end = "# <<< TinyToken <<<";
  let existing = "";
  if (fs.existsSync(rc)) existing = fs.readFileSync(rc, "utf8");
  const cleaned = existing
    .split(/\r?\n/)
    .reduce(
      (acc, line) => {
        if (line === mark) {
          acc.skip = true;
          return acc;
        }
        if (line === end) {
          acc.skip = false;
          return acc;
        }
        if (!acc.skip) acc.lines.push(line);
        return acc;
      },
      { skip: false, lines: [] },
    )
    .lines.join("\n")
    .trimEnd();

  const block = [
    mark,
    ...Object.entries(vars).map(
      ([key, value]) => `export ${key}=${JSON.stringify(value)}`,
    ),
    "unset ANTHROPIC_AUTH_TOKEN 2>/dev/null",
    end,
  ].join("\n");
  writeText(rc, `${cleaned}\n\n${block}\n`);
  ok(`saved environment variables to ${rc}. Open a new terminal to use them.`);
}

function updateClaudeFiles({ endpoint, key, model }) {
  const claudeRootJson = path.join(home, ".claude.json");
  const claudeDir = path.join(home, ".claude");
  const claudeSettings = path.join(claudeDir, "settings.json");
  const credentials = path.join(claudeDir, ".credentials.json");
  const auth = path.join(claudeDir, "auth.json");
  makeBackup([claudeRootJson, claudeSettings, credentials, auth], "claude");

  const root = readJson(claudeRootJson, {});
  root.hasCompletedOnboarding = true;
  root.bypassPermissionsModeAccepted = true;
  root.customApiKeyResponses = approveKey(root.customApiKeyResponses, key);
  writeJson(claudeRootJson, root);

  const settings = readJson(claudeSettings, {});
  settings.hasCompletedOnboarding = true;
  settings.cleanupPeriodDays ??= 30;
  settings.env = {
    ...(settings.env || {}),
    ANTHROPIC_BASE_URL: endpoint,
    ANTHROPIC_API_KEY: key,
    CLAUDE_CODE_ATTRIBUTION_HEADER: "0",
  };
  delete settings.env.ANTHROPIC_AUTH_TOKEN;
  settings.customApiKeyResponses = approveKey(
    settings.customApiKeyResponses,
    key,
  );
  settings.model = model;
  settings.permissions ??= {
    allow: [
      "Edit",
      "Read",
      "Write",
      "Bash",
      "Agent",
      "Glob",
      "Grep",
      "WebSearch",
      "WebFetch",
    ],
    deny: [],
    ask: [],
    defaultMode: "bypassPermissions",
  };
  writeJson(claudeSettings, settings);

  for (const file of [credentials, auth]) {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
  try {
    fs.chmodSync(claudeRootJson, 0o600);
    fs.chmodSync(claudeSettings, 0o600);
  } catch {}

  persistEnv({
    TINYTOKEN_ENDPOINT: endpoint,
    ANTHROPIC_BASE_URL: endpoint,
    ANTHROPIC_API_KEY: key,
  });
  ok("Claude Code configured.");
}

function approveKey(existing, key) {
  const keyTail = String(key).slice(-20);
  const value = existing && typeof existing === "object" ? existing : {};
  const approved = Array.isArray(value.approved) ? [...value.approved] : [];
  const rejected = Array.isArray(value.rejected) ? [...value.rejected] : [];
  if (!approved.includes(keyTail)) approved.push(keyTail);
  return { approved, rejected };
}

function updateCodexFiles({ endpoint, key, model }) {
  const codexDir = path.join(home, ".codex");
  const config = path.join(codexDir, "config.toml");
  const profile = path.join(codexDir, "tinytoken.config.toml");
  const auth = path.join(codexDir, "auth.json");
  makeBackup([config, profile, auth], "codex");

  const stamp = new Date().toISOString();
  writeText(
    config,
    `# Generated by TinyToken setup (${stamp})
model_provider = "tinytoken"
model = "${model}"
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.tinytoken]
name = "TinyToken"
base_url = "${endpoint}"
wire_api = "responses"
`,
  );
  writeText(
    profile,
    `# Generated by TinyToken setup (${stamp})
model_provider = "tinytoken"
model = "${model}"
model_reasoning_effort = "xhigh"
`,
  );
  const authJson = readJson(auth, {});
  authJson.OPENAI_API_KEY = key;
  writeJson(auth, authJson);
  try {
    fs.chmodSync(auth, 0o600);
  } catch {}

  persistEnv({
    TINYTOKEN_ENDPOINT: endpoint,
    OPENAI_BASE_URL: `${endpoint}/v1`,
    OPENAI_API_KEY: key,
  });
  ok("Codex CLI configured.");
}

function updateGeminiFiles({ endpoint, key, model }) {
  const geminiDir = path.join(home, ".gemini");
  const settingsFile = path.join(geminiDir, "settings.json");
  makeBackup([settingsFile], "gemini");

  const settings = readJson(settingsFile, {});
  settings.model = { ...(settings.model || {}), name: model };
  settings.privacy = {
    ...(settings.privacy || {}),
    usageStatisticsEnabled: false,
  };
  writeJson(settingsFile, settings);

  persistEnv({
    TINYTOKEN_ENDPOINT: endpoint,
    TINYTOKEN_GEMINI_BASE_URL: `${endpoint}/v1beta`,
    GEMINI_API_KEY: key,
    GEMINI_MODEL: model,
  });
  warn(
    "Official Gemini CLI may not fully support custom TinyToken base URL. Use the Gemini-compatible endpoint with clients that allow base URL override.",
  );
  ok("Gemini-compatible settings saved.");
}

function updateOtherFiles({ endpoint, key, model }) {
  const envFile = path.join(tinyDir, "openai-compatible.env");
  const guideFile = path.join(tinyDir, "openai-compatible.txt");
  makeBackup([envFile, guideFile], "openai-compatible");
  writeText(
    envFile,
    `OPENAI_BASE_URL=${endpoint}/v1
OPENAI_API_KEY=${key}
MODEL=${model}
ANTHROPIC_BASE_URL=${endpoint}
ANTHROPIC_API_KEY=${key}
GEMINI_BASE_URL=${endpoint}/v1beta
GEMINI_API_KEY=${key}
`,
  );
  writeText(
    guideFile,
    `TinyToken OpenAI-compatible values

Base URL: ${endpoint}/v1
API Key:  ${key}
Model:    ${model}

Use these values in tools such as OpenClaw, opencode, Hermes Agent, Aider, Roo/Cline, Cherry Studio, or any app that supports OpenAI-compatible custom endpoint.
`,
  );
  persistEnv({
    TINYTOKEN_ENDPOINT: endpoint,
    OPENAI_BASE_URL: `${endpoint}/v1`,
    OPENAI_API_KEY: key,
  });
  ok(`OpenAI-compatible guide saved to ${guideFile}`);
}

async function testConnection() {
  const state = loadState();
  const endpoint = await askEndpoint("Endpoint / Base URL", state.endpoint);
  const detected = detectKey();
  const enteredKey = await ask(
    detected ? `API key (Enter to use ${maskKey(detected)})` : "API key",
    "",
  );
  const key = normalizeKey(enteredKey || detected);
  say("\nTest type:");
  say("  1. OpenAI model list /v1/models (no credit)");
  say("  2. Claude message /v1/messages (uses small credit)");
  say("  3. OpenAI chat /v1/chat/completions (uses small credit)");
  say("  4. Gemini-compatible model list /v1beta/models (no credit)");
  const choice = await ask("Choose", "1");
  const model =
    choice === "2"
      ? await ask("Claude model", state.models.claude)
      : choice === "3"
        ? await ask("Chat model", state.models.openai)
        : "";

  let url = `${endpoint}/v1/models`;
  let options = { method: "GET", headers: { Authorization: `Bearer ${key}` } };

  if (choice === "2") {
    url = `${endpoint}/v1/messages`;
    options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: "pong" }],
      }),
    };
  } else if (choice === "3") {
    url = `${endpoint}/v1/chat/completions`;
    options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
      }),
    };
  } else if (choice === "4") {
    url = `${endpoint}/v1beta/models`;
    options = { method: "GET", headers: { "x-goog-api-key": key } };
  }

  say(`\nTesting ${url} ...`);
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    if (response.ok) ok(`HTTP ${response.status} OK`);
    else warn(`HTTP ${response.status}`);
    say(text.slice(0, 900));
  } catch (error) {
    fail(`Connection failed: ${error.message}`);
  }
}

function showCurrentConfig() {
  const state = loadState();
  const key = detectKey();
  say("\nCurrent TinyToken setup:");
  say(`Endpoint: ${state.endpoint}`);
  say(`API key:  ${key ? maskKey(key) : "(not found)"}`);
  say(`Claude:   ${state.models.claude}`);
  say(`Codex:    ${state.models.codex}`);
  say(`Gemini:   ${state.models.gemini}`);
  say(`Other:    ${state.models.openai}`);
  say(`Backups:  ${backupRoot}`);
}

async function configureClaude() {
  const values = await collectBasics("Claude Code", "claude");
  await maybeInstall("@anthropic-ai/claude-code", "Claude Code");
  updateClaudeFiles(values);
  say(`\nRun: claude --model ${values.model}`);
}

async function configureCodex() {
  const values = await collectBasics("Codex CLI", "codex");
  await maybeInstall("@openai/codex", "Codex CLI");
  updateCodexFiles(values);
  say("\nRun: codex --profile tinytoken");
}

async function configureGemini() {
  const values = await collectBasics("Gemini-compatible", "gemini");
  const install = await askYesNo(
    "Install official @google/gemini-cli? (TinyToken base URL support may depend on client version)",
    false,
  );
  if (install) npmInstall("@google/gemini-cli");
  updateGeminiFiles(values);
  say(`\nGemini-compatible endpoint: ${values.endpoint}/v1beta`);
}

async function configureOther() {
  const values = await collectBasics(
    "OpenAI-compatible / Other tools",
    "openai",
  );
  updateOtherFiles(values);
}

async function changeDefaults() {
  const state = loadState();
  state.endpoint = await askEndpoint(
    "Default endpoint / Base URL",
    state.endpoint,
  );
  state.models.claude = await ask("Default Claude model", state.models.claude);
  state.models.codex = await ask("Default Codex model", state.models.codex);
  state.models.gemini = await ask("Default Gemini model", state.models.gemini);
  state.models.openai = await ask(
    "Default OpenAI-compatible model",
    state.models.openai,
  );
  saveState(state);
  ok("defaults saved");
}

async function mainMenu() {
  ensureDir(tinyDir);
  while (true) {
    say(`\n${colors.bold}${colors.blue}TinyToken Setup${colors.reset}`);
    showThaiGuide();
    say("");
    say("  1. ตั้งค่า Claude Code");
    say("  2. ตั้งค่า Codex CLI");
    say("  3. ตั้งค่า Gemini-compatible");
    say("  4. ตั้งค่าโปรแกรมอื่น / OpenAI-compatible");
    say("  5. ทดสอบ connection / check key");
    say("  6. เปลี่ยน endpoint และ model เริ่มต้น");
    say("  7. ดู config ปัจจุบัน");
    say("  8. ย้อนกลับ backup");
    say("  9. ออก");
    const choice = await ask("เลือกเมนูหลัก", "1");
    try {
      if (choice === "1") await configureClaude();
      else if (choice === "2") await configureCodex();
      else if (choice === "3") await configureGemini();
      else if (choice === "4") await configureOther();
      else if (choice === "5") await testConnection();
      else if (choice === "6") await changeDefaults();
      else if (choice === "7") showCurrentConfig();
      else if (choice === "8") await restoreBackup();
      else if (choice === "9") break;
      else warn("Unknown choice.");
    } catch (error) {
      fail(error.message);
    }
  }
  rl.close();
}

mainMenu().catch((error) => {
  fail(error.message);
  rl.close();
  process.exit(1);
});
