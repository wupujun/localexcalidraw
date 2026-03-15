import type { SceneData } from "./api";

const APP_STATE_KEYS = [
  "theme",
  "viewBackgroundColor",
  "currentItemBackgroundColor",
  "currentItemEndArrowhead",
  "currentItemFillStyle",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemOpacity",
  "currentItemRoughness",
  "currentItemRoundness",
  "currentItemArrowType",
  "currentItemStartArrowhead",
  "currentItemStrokeColor",
  "currentItemStrokeStyle",
  "currentItemStrokeWidth",
  "currentItemTextAlign",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
  "isBindingEnabled",
  "scrollX",
  "scrollY",
  "zoom",
  "name"
] as const;

type SafeAppState = Record<string, unknown>;

export function sanitizeScene(scene: SceneData | null | undefined): SceneData {
  const safeAppState: SafeAppState = {};
  const appState = scene?.appState ?? {};

  for (const key of APP_STATE_KEYS) {
    const value = appState[key];
    if (value !== undefined) {
      safeAppState[key] = value;
    }
  }

  return {
    type: "excalidraw",
    version: 2,
    source: "local-whiteboard-app",
    elements: Array.isArray(scene?.elements) ? [...scene.elements] : [],
    appState: safeAppState,
    files: scene?.files && typeof scene.files === "object" ? scene.files : {}
  };
}

export function createStableSceneSnapshot(title: string, scene: SceneData) {
  const normalizedElements = scene.elements.map((element) => normalizeValue(element));
  const normalizedAppState = normalizeValue(scene.appState);
  const normalizedFiles = normalizeValue(scene.files);

  return JSON.stringify({
    title: title.trim(),
    scene: {
      type: "excalidraw",
      version: 2,
      source: "local-whiteboard-app",
      elements: normalizedElements,
      appState: normalizedAppState,
      files: normalizedFiles
    }
  });
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(input).sort()) {
      if (shouldIgnoreKey(key)) {
        continue;
      }
      output[key] = normalizeValue(input[key]);
    }

    return output;
  }

  return value;
}

function shouldIgnoreKey(key: string) {
  return key === "updated" || key === "versionNonce";
}
