import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchBoard, saveBoard, type SceneData } from "../api";
import { ExcalidrawCanvas } from "../components/ExcalidrawCanvas";
import { sanitizeScene } from "../scene";
import {
  AUTOSAVE_INTERVAL_SECONDS,
  createSavedSnapshot,
  getAutosaveText,
  getNextAutosaveCountdown,
  getNextSaveStatus,
  type SaveStatus
} from "../editorState";

export function EditorPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const savedSnapshotRef = useRef<string>("");
  const [title, setTitle] = useState("Untitled board");
  const [initialScene, setInitialScene] = useState<SceneData | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [secondsUntilAutosave, setSecondsUntilAutosave] = useState(AUTOSAVE_INTERVAL_SECONDS);

  useEffect(() => {
    if (!boardId) {
      return;
    }
    void loadBoard(boardId);
  }, [boardId]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (status === "dirty" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (status === "dirty") {
      setSecondsUntilAutosave(AUTOSAVE_INTERVAL_SECONDS);
      const interval = window.setInterval(() => {
        setSecondsUntilAutosave((current) => {
          const next = getNextAutosaveCountdown(current);
          if (next.shouldAutosave) {
            void handleSave(true);
          }
          return next.nextSecondsUntilAutosave;
        });
      }, 1000);

      return () => window.clearInterval(interval);
    }

    setSecondsUntilAutosave(AUTOSAVE_INTERVAL_SECONDS);
  }, [isLoaded, status]);

  async function loadBoard(id: string) {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchBoard(id);
      const sanitizedScene = sanitizeScene(data.scene);
      setTitle(data.meta.title);
      setInitialScene(sanitizedScene);
      savedSnapshotRef.current = createSavedSnapshot(data.meta.title, sanitizedScene);
      setStatus("saved");
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
      setStatus("error");
    }
  }

  async function handleSave(isAutosave = false) {
    if (!boardId || !excalidrawRef.current) {
      return;
    }

    if (status === "saving") {
      return;
    }

    const elements = excalidrawRef.current.getSceneElementsIncludingDeleted();
    const appState = excalidrawRef.current.getAppState();
    const files = excalidrawRef.current.getFiles();
    const nextScene: SceneData = {
      type: "excalidraw",
      version: 2,
      source: "local-whiteboard-app",
      elements,
      appState,
      files
    };
    const sanitizedScene = sanitizeScene(nextScene);

    setStatus("saving");
    setError(null);

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const previewBlob = await exportToBlob({
        elements: elements.filter((element) => !element.isDeleted),
        appState: {
          ...appState,
          exportBackground: true
        },
        files,
        mimeType: "image/png"
      });

      const preview = await blobToDataUrl(previewBlob);
      await saveBoard(boardId, { title, scene: sanitizedScene, preview });
      savedSnapshotRef.current = createSavedSnapshot(title, sanitizedScene);
      setStatus("saved");
      setSecondsUntilAutosave(AUTOSAVE_INTERVAL_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isAutosave ? "auto-save" : "save"} board`);
      setStatus("error");
    }
  }

  function handleSceneChange(
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) {
    if (!isLoaded) {
      return;
    }

    const currentScene = sanitizeScene({
      type: "excalidraw",
      version: 2,
      source: "local-whiteboard-app",
      elements: [...elements],
      appState,
      files
    });
    setStatus((current) => getNextSaveStatus(current, title, currentScene, savedSnapshotRef.current));
  }

  function handleBack() {
    if (status === "dirty" || status === "saving") {
      const confirmed = window.confirm("Leave without saving your latest changes?");
      if (!confirmed) {
        return;
      }
    }
    navigate("/");
  }

  if (!boardId) {
    return <div className="editor-shell">Missing board id.</div>;
  }

  if (status === "loading" || !initialScene) {
    return <div className="editor-shell">Loading board...</div>;
  }

  return (
    <div className="editor-shell">
      <header className="editor-header">
        <button className="secondary-button" onClick={handleBack}>
          Back
        </button>
        <label className="title-field">
          <span>Board</span>
          <input
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);

              const currentScene = getCurrentSceneSnapshot(excalidrawRef.current);
              if (!currentScene) {
                return;
              }

              setStatus((current) => getNextSaveStatus(current, nextTitle, currentScene, savedSnapshotRef.current));
            }}
          />
        </label>
        <div className="save-meta">
          <span className={`save-pill ${status}`}>{renderStatus(status)}</span>
          <span className="autosave-text">{getAutosaveText(status, secondsUntilAutosave)}</span>
        </div>
        <button className="primary-button" onClick={() => void handleSave()} disabled={status === "saving"}>
          Save
        </button>
      </header>

      {error ? <div className="editor-banner error">{error}</div> : null}

      <div className="editor-canvas">
        <ExcalidrawCanvas
          scene={initialScene}
          onReady={(api) => {
            excalidrawRef.current = api;
          }}
          onChange={handleSceneChange}
        />
      </div>
    </div>
  );
}

function renderStatus(status: SaveStatus) {
  switch (status) {
    case "saved":
      return "Saved";
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving";
    case "error":
      return "Error";
    default:
      return "Loading";
  }
}

function getCurrentSceneSnapshot(api: ExcalidrawImperativeAPI | null): SceneData | null {
  if (!api) {
    return null;
  }

  return sanitizeScene({
    type: "excalidraw",
    version: 2,
    source: "local-whiteboard-app",
    elements: api.getSceneElementsIncludingDeleted(),
    appState: api.getAppState(),
    files: api.getFiles()
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read preview"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read preview"));
    reader.readAsDataURL(blob);
  });
}
