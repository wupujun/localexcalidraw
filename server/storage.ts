import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

export type SceneData = {
  type: "excalidraw";
  version: number;
  source: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export type BoardMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  previewPath: string | null;
};

export type BoardRecord = {
  meta: BoardMeta;
  scene: SceneData;
};

const APP_STATE_KEYS = new Set([
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
]);

const emptyScene = (): SceneData => ({
  type: "excalidraw",
  version: 2,
  source: "local-whiteboard-app",
  elements: [],
  appState: {},
  files: {}
});

function sanitizeScene(scene: SceneData): SceneData {
  const appStateEntries = Object.entries(scene.appState ?? {}).filter(([key]) => APP_STATE_KEYS.has(key));

  return {
    type: "excalidraw",
    version: 2,
    source: "local-whiteboard-app",
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: Object.fromEntries(appStateEntries),
    files: scene.files && typeof scene.files === "object" ? scene.files : {}
  };
}

async function ensureStorage() {
  const { boardsDir, metaDir, previewsDir } = getStoragePaths();
  await Promise.all([
    mkdir(boardsDir, { recursive: true }),
    mkdir(metaDir, { recursive: true }),
    mkdir(previewsDir, { recursive: true })
  ]);
}

function scenePath(id: string) {
  const { boardsDir } = getStoragePaths();
  return path.join(boardsDir, `${id}.scene.json`);
}

function metaPath(id: string) {
  const { metaDir } = getStoragePaths();
  return path.join(metaDir, `${id}.json`);
}

function previewDiskPath(id: string) {
  const { previewsDir } = getStoragePaths();
  return path.join(previewsDir, `${id}.png`);
}

export async function listBoards(): Promise<BoardMeta[]> {
  await ensureStorage();
  const { metaDir } = getStoragePaths();
  const files = await readdir(metaDir);
  const items = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const content = await readFile(path.join(metaDir, file), "utf8");
        return JSON.parse(content) as BoardMeta;
      })
  );

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createBoard(title = "Untitled board"): Promise<BoardRecord> {
  await ensureStorage();
  const id = `b_${nanoid(10)}`;
  const now = new Date().toISOString();
  const meta: BoardMeta = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    previewPath: null
  };
  const scene = emptyScene();

  await Promise.all([
    writeFile(metaPath(id), JSON.stringify(meta, null, 2), "utf8"),
    writeFile(scenePath(id), JSON.stringify(scene, null, 2), "utf8")
  ]);

  return { meta, scene };
}

export async function getBoard(id: string): Promise<BoardRecord | null> {
  await ensureStorage();
  try {
    const [metaRaw, sceneRaw] = await Promise.all([
      readFile(metaPath(id), "utf8"),
      readFile(scenePath(id), "utf8")
    ]);
    return {
      meta: JSON.parse(metaRaw) as BoardMeta,
      scene: sanitizeScene(JSON.parse(sceneRaw) as SceneData)
    };
  } catch {
    return null;
  }
}

export async function saveBoard(
  id: string,
  title: string,
  scene: SceneData,
  previewBase64?: string | null
): Promise<BoardRecord | null> {
  await ensureStorage();
  const existing = await getBoard(id);
  if (!existing) {
    return null;
  }

  const updatedMeta: BoardMeta = {
    ...existing.meta,
    title,
    updatedAt: new Date().toISOString(),
    previewPath: previewBase64 ? `/previews/${id}.png` : existing.meta.previewPath
  };
  const sanitizedScene = sanitizeScene(scene);

  const writes: Array<Promise<unknown>> = [
    writeFile(metaPath(id), JSON.stringify(updatedMeta, null, 2), "utf8"),
    writeFile(scenePath(id), JSON.stringify(sanitizedScene, null, 2), "utf8")
  ];

  if (previewBase64) {
    const payload = previewBase64.replace(/^data:image\/png;base64,/, "");
    writes.push(writeFile(previewDiskPath(id), payload, "base64"));
  }

  await Promise.all(writes);

  return { meta: updatedMeta, scene: sanitizedScene };
}

export async function deleteBoard(id: string): Promise<boolean> {
  await ensureStorage();
  const existing = await getBoard(id);
  if (!existing) {
    return false;
  }

  await Promise.all([
    rm(metaPath(id), { force: true }),
    rm(scenePath(id), { force: true }),
    rm(previewDiskPath(id), { force: true })
  ]);

  return true;
}

export async function hasPreview(id: string): Promise<boolean> {
  try {
    await stat(previewDiskPath(id));
    return true;
  } catch {
    return false;
  }
}

function getStoragePaths() {
  const dataRoot = process.env.WHITEBOARD_DATA_DIR
    ? path.resolve(process.env.WHITEBOARD_DATA_DIR)
    : path.join(process.cwd(), "data");

  return {
    dataRoot,
    boardsDir: path.join(dataRoot, "boards"),
    metaDir: path.join(dataRoot, "meta"),
    previewsDir: path.join(dataRoot, "previews")
  };
}
