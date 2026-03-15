import test from "node:test";
import assert from "node:assert/strict";
import type { SceneData } from "./api";
import {
  AUTOSAVE_INTERVAL_SECONDS,
  createSavedSnapshot,
  getAutosaveText,
  getNextAutosaveCountdown,
  getNextSaveStatus
} from "./editorState.js";

function makeScene(overrides?: Partial<SceneData>): SceneData {
  return {
    type: "excalidraw",
    version: 2,
    source: "test-suite",
    elements: [],
    appState: { zoom: { value: 1 } },
    files: {},
    ...overrides
  };
}

test("no scene change keeps board saved", () => {
  const scene = makeScene();
  const savedSnapshot = createSavedSnapshot("Board A", scene);
  assert.equal(getNextSaveStatus("saved", "Board A", scene, savedSnapshot), "saved");
});

test("scene change marks board dirty", () => {
  const originalScene = makeScene();
  const changedScene = makeScene({
    elements: [{ id: "shape-1", type: "rectangle", x: 10, y: 20, width: 30, height: 40 }]
  });
  const savedSnapshot = createSavedSnapshot("Board A", originalScene);
  assert.equal(getNextSaveStatus("saved", "Board A", changedScene, savedSnapshot), "dirty");
});

test("title change marks board dirty until saved", () => {
  const scene = makeScene();
  const oldSnapshot = createSavedSnapshot("Board A", scene);
  const newSnapshot = createSavedSnapshot("Board B", scene);
  assert.equal(getNextSaveStatus("saved", "Board B", scene, oldSnapshot), "dirty");
  assert.equal(getNextSaveStatus("saved", "Board B", scene, newSnapshot), "saved");
});

test("unstable excalidraw metadata does not mark board dirty", () => {
  const originalScene = makeScene({
    elements: [{ id: "shape-1", type: "rectangle", updated: 1, versionNonce: 2 }]
  });
  const metadataOnlyChange = makeScene({
    elements: [{ id: "shape-1", type: "rectangle", updated: 999, versionNonce: 12345 }]
  });
  const savedSnapshot = createSavedSnapshot("Board A", originalScene);
  assert.equal(getNextSaveStatus("saved", "Board A", metadataOnlyChange, savedSnapshot), "saved");
});

test("autosave countdown triggers on zero crossing", () => {
  assert.deepEqual(getNextAutosaveCountdown(5), {
    shouldAutosave: false,
    nextSecondsUntilAutosave: 4
  });
  assert.deepEqual(getNextAutosaveCountdown(1), {
    shouldAutosave: true,
    nextSecondsUntilAutosave: AUTOSAVE_INTERVAL_SECONDS
  });
});

test("autosave text matches dirty and clean states", () => {
  assert.equal(getAutosaveText("dirty", 12), "Auto-save in 12s");
  assert.equal(getAutosaveText("saved", AUTOSAVE_INTERVAL_SECONDS), "Auto-save every 30s");
});
