import { lazy, Suspense } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { SceneData } from "../api";

const Excalidraw = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  return { default: mod.Excalidraw };
});

type ExcalidrawChangeHandler = (
  elements: readonly unknown[],
  appState: Record<string, unknown>,
  files: Record<string, unknown>
) => void;

type Props = {
  scene: SceneData;
  onReady: (api: ExcalidrawImperativeAPI) => void;
  onChange: ExcalidrawChangeHandler;
};

export function ExcalidrawCanvas({ scene, onReady, onChange }: Props) {
  return (
    <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
      <Excalidraw
        excalidrawAPI={onReady}
        initialData={scene}
        onChange={onChange}
      />
    </Suspense>
  );
}
