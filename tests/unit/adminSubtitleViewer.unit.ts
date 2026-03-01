import assert from "node:assert/strict";
import {
  toSubtitleViewerErrorState,
  toSubtitleViewerState,
} from "../../lib/adminSubtitleViewer";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runCase("maps successful archive payload to viewer state", () => {
  const state = toSubtitleViewerState("Bluey", {
    found: true,
    subtitleStatus: "success",
    source: "r2_archive",
    dialogueLines: 120,
    transcript: "hello world",
    storageKey: "subtitles/test.txt",
  });
  assert.equal(state.label, "Bluey");
  assert.equal(state.loading, false);
  assert.equal(state.found, true);
  assert.equal(state.transcript, "hello world");
  assert.equal(state.message, undefined);
  assert.equal(state.subtitleStatus, "success");
  assert.equal(state.source, "r2_archive");
  assert.equal(state.dialogueLines, 120);
});

runCase("maps missing archive payload to viewer state", () => {
  const state = toSubtitleViewerState("Aladdin", {
    found: false,
    message: "No archive",
    subtitleStatus: "failed",
  });
  assert.equal(state.label, "Aladdin");
  assert.equal(state.loading, false);
  assert.equal(state.found, false);
  assert.equal(state.transcript, undefined);
  assert.equal(state.message, "No archive");
  assert.equal(state.subtitleStatus, "failed");
});

runCase("builds consistent error state for fetch failures", () => {
  const state = toSubtitleViewerErrorState("Paw Patrol", "network down");
  assert.equal(state.label, "Paw Patrol");
  assert.equal(state.loading, false);
  assert.equal(state.found, false);
  assert.equal(
    state.message,
    "Failed to load archived subtitles: network down"
  );
});
