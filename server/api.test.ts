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

  const recordingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}/recordings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Mock Interview Replay",
      durationMs: 32000,
      audioMimeType: "audio/webm",
      audioBase64: "data:audio/webm;base64,ZmFrZQ==",
      frames: [
        {
          timestampMs: 0,
          imageBase64: "data:image/png;base64,ZmFrZQ=="
        }
      ]
    })
  });
  assert.equal(recordingResponse.status, 201);
  const createdRecording = await recordingResponse.json() as {
    id: string;
    title: string;
    audioPath: string;
    audioMimeType: string;
    frames: Array<{ timestampMs: number; imagePath: string }>;
  };
  assert.equal(createdRecording.title, "Mock Interview Replay");
  assert.match(createdRecording.id, /^r_/);
  assert.equal(createdRecording.audioMimeType, "audio/webm");
  assert.match(createdRecording.audioPath, /\.webm$/);
  assert.equal(createdRecording.frames.length, 1);

  const listRecordingsResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}/recordings`);
  assert.equal(listRecordingsResponse.status, 200);
  const recordings = await listRecordingsResponse.json() as Array<{ id: string }>;
  assert.equal(recordings.length, 1);
  assert.equal(recordings[0]?.id, createdRecording.id);

  const getRecordingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}/recordings/${createdRecording.id}`);
  assert.equal(getRecordingResponse.status, 200);
  const fetchedRecording = await getRecordingResponse.json() as {
    id: string;
    audioPath: string;
    audioMimeType: string;
    frames: Array<{ imagePath: string }>;
  };
  assert.equal(fetchedRecording.id, createdRecording.id);
  assert.equal(fetchedRecording.audioMimeType, "audio/webm");
  assert.match(fetchedRecording.audioPath, /\/recordings\//);
  assert.match(fetchedRecording.frames[0]?.imagePath ?? "", /\/recordings\//);

  const deleteRecordingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}/recordings/${createdRecording.id}`, {
    method: "DELETE"
  });
  assert.equal(deleteRecordingResponse.status, 204);

  const missingRecordingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}/recordings/${createdRecording.id}`);
  assert.equal(missingRecordingResponse.status, 404);

  const deleteResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`, {
    method: "DELETE"
  });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/boards/${createdBoard.id}`);
  assert.equal(missingResponse.status, 404);
});
