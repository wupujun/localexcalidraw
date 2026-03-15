import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "./index.js";

test("board CRUD API lifecycle", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "whiteboard-api-"));
  process.env.WHITEBOARD_DATA_DIR = tempDir;

  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    server.close();
    delete process.env.WHITEBOARD_DATA_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  const createResponse = await fetch(`${baseUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "API Test Board" })
  });
  assert.equal(createResponse.status, 201);
  const createdBoard = await createResponse.json() as { id: string; title: string };
  assert.equal(createdBoard.title, "API Test Board");
  assert.match(createdBoard.id, /^b_/);

  const listResponse = await fetch(`${baseUrl}/api/boards`);
  assert.equal(listResponse.status, 200);
  const boards = await listResponse.json() as Array<{ id: string; title: string }>;
  assert.equal(boards.length, 1);
  assert.equal(boards[0]?.id, createdBoard.id);

  const getResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`);
  assert.equal(getResponse.status, 200);
  const boardRecord = await getResponse.json() as {
    meta: { id: string; title: string; previewPath: string | null };
    scene: { type: string; elements: unknown[] };
  };
  assert.equal(boardRecord.meta.title, "API Test Board");
  assert.equal(boardRecord.scene.type, "excalidraw");
  assert.deepEqual(boardRecord.scene.elements, []);

  const updateResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Renamed Board",
      scene: {
        type: "excalidraw",
        version: 2,
        source: "test-suite",
        elements: [
          {
            id: "shape-1",
            type: "rectangle",
            x: 10,
            y: 20,
            width: 30,
            height: 40,
            updated: 123,
            versionNonce: 999
          }
        ],
        appState: {
          theme: "light",
          zoom: { value: 1 },
          openMenu: "should-be-filtered"
        },
        files: {}
      }
    })
  });
  assert.equal(updateResponse.status, 200);
  const updatedBoard = await updateResponse.json() as {
    meta: { title: string };
    scene: { appState: Record<string, unknown>; elements: Array<Record<string, unknown>> };
  };
  assert.equal(updatedBoard.meta.title, "Renamed Board");
  assert.equal(updatedBoard.scene.appState.theme, "light");
  assert.equal(updatedBoard.scene.appState.openMenu, undefined);
  assert.equal(updatedBoard.scene.elements[0]?.updated, 123);

  const deleteResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`, {
    method: "DELETE"
  });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`);
  assert.equal(missingResponse.status, 404);
});
