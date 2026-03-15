import type { SceneData } from "./api";
import { createStableSceneSnapshot } from "./scene";

export type SaveStatus = "loading" | "saved" | "dirty" | "saving" | "error";

export const AUTOSAVE_INTERVAL_SECONDS = 30;

export function createSavedSnapshot(title: string, scene: SceneData) {
  return createStableSceneSnapshot(title, scene);
}

export function getNextSaveStatus(
  currentStatus: SaveStatus,
  title: string,
  scene: SceneData,
  savedSnapshot: string
): SaveStatus {
  if (currentStatus === "saving") {
    return currentStatus;
  }

  const nextSnapshot = createStableSceneSnapshot(title, scene);
  return nextSnapshot === savedSnapshot ? "saved" : "dirty";
}

export function getNextAutosaveCountdown(secondsUntilAutosave: number) {
  if (secondsUntilAutosave <= 1) {
    return {
      shouldAutosave: true,
      nextSecondsUntilAutosave: AUTOSAVE_INTERVAL_SECONDS
    };
  }

  return {
    shouldAutosave: false,
    nextSecondsUntilAutosave: secondsUntilAutosave - 1
  };
}

export function getAutosaveText(status: SaveStatus, secondsUntilAutosave: number) {
  if (status === "dirty") {
    return `Auto-save in ${secondsUntilAutosave}s`;
  }
  if (status === "saving") {
    return "Auto-save active";
  }
  if (status === "error") {
    return "Auto-save paused";
  }
  return `Auto-save every ${AUTOSAVE_INTERVAL_SECONDS}s`;
}
