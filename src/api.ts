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

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchBoards() {
  return parseJson<BoardMeta[]>(await fetch("/api/boards"));
}

export async function createBoard(title = "Untitled board") {
  return parseJson<BoardMeta>(
    await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    })
  );
}

export async function fetchBoard(id: string) {
  return parseJson<BoardRecord>(await fetch(`/api/boards/${id}`));
}

export async function saveBoard(id: string, payload: { title: string; scene: SceneData; preview?: string | null }) {
  return parseJson<BoardRecord>(
    await fetch(`/api/boards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function removeBoard(id: string) {
  const response = await fetch(`/api/boards/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Delete failed with ${response.status}`);
  }
}
