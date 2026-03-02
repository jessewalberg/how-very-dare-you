#!/usr/bin/env bun

import { spawn } from "node:child_process";

const timeoutSeconds = Number.parseInt(
  process.env.BUILD_TIMEOUT_SEC ?? "240",
  10
);
const timeoutMs = Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
  ? timeoutSeconds * 1000
  : 240_000;
const startedAt = Date.now();

console.log(
  `[build:timed] Starting build with timeout ${Math.round(timeoutMs / 1000)}s`
);

const child = spawn("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  console.error(
    `[build:timed] Timeout reached after ${Math.round(timeoutMs / 1000)}s. Sending SIGTERM...`
  );
  child.kill("SIGTERM");

  setTimeout(() => {
    if (!child.killed) {
      console.error("[build:timed] Process still running, sending SIGKILL.");
      child.kill("SIGKILL");
    }
  }, 5_000).unref();
}, timeoutMs);

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (timedOut) {
    console.error(
      `[build:timed] Build timed out after ${elapsed}s (signal=${signal ?? "none"}).`
    );
    process.exit(124);
  }

  if (signal) {
    console.error(`[build:timed] Build exited by signal ${signal} after ${elapsed}s.`);
    process.exit(1);
  }

  console.log(`[build:timed] Build finished in ${elapsed}s (exit=${code ?? 0}).`);
  process.exit(code ?? 0);
});
