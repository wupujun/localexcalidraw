# Whiteboard CRUD App Design

## Goal

Build a web app that lets a user:

- create a whiteboard
- edit it with the Excalidraw editor
- save it to a local server
- view all saved whiteboards
- reopen and edit an existing whiteboard
- delete a whiteboard

The app should use the official Excalidraw editor component so the drawing experience stays close to Excalidraw, while the surrounding UX is optimized for local file management.

## Product Direction

This is the `App-style` option:

- the editor experience is Excalidraw-like
- the app shell is a local whiteboard manager
- storage is controlled by our server
- saved boards are listed as first-class records in the app

We are not trying to remote-control `www.excalidraw.com` directly. Instead, we use the official Excalidraw package and keep compatibility with Excalidraw scene data.

## Primary User Flows

### 1. Create a board

1. User opens the app home page.
2. User clicks `New board`.
3. Frontend calls `POST /api/boards`.
4. Backend creates a new board record and empty scene file.
5. Frontend navigates to `/boards/:id/edit`.
6. Excalidraw opens with an empty canvas.

### 2. Save a board

1. User edits the canvas.
2. Frontend tracks dirty state from editor changes.
3. User clicks `Save` or autosave runs after a short delay.
4. Frontend sends the current scene JSON to `PUT /api/boards/:id`.
5. Backend writes the board JSON to disk and updates metadata.
6. Frontend shows `Saved`.

### 3. View boards

1. Frontend loads `GET /api/boards`.
2. Backend returns board metadata and preview info.
3. UI renders a searchable board list.
4. User can preview, open, rename, or delete a board.

### 4. Reopen and edit

1. User clicks a board.
2. Frontend loads `GET /api/boards/:id`.
3. Scene data is passed into Excalidraw `initialData`.
4. User edits and saves again.

### 5. Delete a board

1. User clicks `Delete`.
2. Frontend asks for confirmation.
3. Frontend calls `DELETE /api/boards/:id`.
4. Backend removes the board and thumbnail files.
5. UI removes it from the list.

## Screen Design

## Home Page: `/`

Purpose:

- browse all whiteboards
- create a new one
- preview board details

Layout:

- left sidebar: app brand, search, `New board` button
- main content: board grid or list
- right detail panel: selected board preview and actions

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Whiteboards                                         [Search.................]    |
+---------------------------+------------------------------------------------------+
| Local Boards              | Board Grid                                            |
|                           |                                                      |
| [ + New board ]           | +----------------+ +----------------+ +------------+ |
|                           | | Thumbnail      | | Thumbnail      | | Thumbnail  | |
| Recent                    | | Project Map    | | Sprint Notes   | | Blank      | |
| - Project Map             | | Updated 2h ago | | Updated 1d ago | | New        | |
| - Sprint Notes            | +----------------+ +----------------+ +------------+ |
| - API Draft               |                                                      |
|                           |                                                      |
+---------------------------+----------------------------------+-------------------+
| Selected board: Project Map                                  | Actions           |
| Last updated: 2026-03-14 10:20                               | [Open] [Rename]   |
| Preview thumbnail                                            | [Delete]          |
+--------------------------------------------------------------+-------------------+
```

Behavior:

- selecting a card updates the right panel
- double-clicking or `Open` enters editor mode
- `New board` immediately creates a board and opens it

## Editor Page: `/boards/:id/edit`

Purpose:

- full editing experience
- explicit save state
- safe exit back to board list

Layout:

- top bar for navigation and save actions
- Excalidraw canvas fills the rest of the viewport

Wireframe:

```text
+----------------------------------------------------------------------------------+
| <- Back | Board: Project Map                 Unsaved changes      [Save] [More]  |
+----------------------------------------------------------------------------------+
|                                                                                  |
|                               Excalidraw Editor                                  |
|                                                                                  |
|                     same drawing canvas behavior as Excalidraw                   |
|                                                                                  |
|                                                                                  |
+----------------------------------------------------------------------------------+
```

Top bar actions:

- `Back`
- editable board title
- save status: `Saved`, `Saving`, `Unsaved`
- `Save`
- `More` menu:
  - `Rename`
  - `Duplicate`
  - `Delete`
  - `Export .excalidraw`
  - `Export PNG`

Behavior:

- if user tries to leave with unsaved changes, show a confirm prompt
- autosave can run after inactivity, but manual `Save` remains visible

## UX Principles

- the drawing area should dominate the screen
- the board manager should feel lightweight and local-first
- save state should always be visible
- file operations should be simple and explicit
- avoid cloning the exact excalidraw.com shell

## Technical Design

## Frontend Stack

Recommended:

- React
- Vite
- TypeScript
- React Router
- `@excalidraw/excalidraw`

Reason:

- fast to scaffold in an empty repo
- simple local development
- enough structure for list + editor routes

## Backend Stack

Recommended:

- Node.js
- Express
- TypeScript

Reason:

- easy local file storage
- simple CRUD endpoints
- direct control over board JSON and preview files

## Storage Model

Directory layout:

```text
data/
  boards/
    <id>.scene.json
  meta/
    <id>.json
  previews/
    <id>.png
```

Metadata example:

```json
{
  "id": "b_01jqx3s8v8zv",
  "title": "Project Map",
  "createdAt": "2026-03-14T17:12:00.000Z",
  "updatedAt": "2026-03-14T18:05:11.000Z",
  "previewPath": "/previews/b_01jqx3s8v8zv.png"
}
```

Scene file example:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "local-whiteboard-app",
  "elements": [],
  "appState": {},
  "files": {}
}
```

## API Contract

### `GET /api/boards`

Returns a list of board metadata.

Response:

```json
[
  {
    "id": "b_01",
    "title": "Project Map",
    "updatedAt": "2026-03-14T18:05:11.000Z",
    "previewPath": "/previews/b_01.png"
  }
]
```

### `POST /api/boards`

Creates a new empty board.

Request:

```json
{
  "title": "Untitled board"
}
```

Response:

```json
{
  "id": "b_01",
  "title": "Untitled board"
}
```

### `GET /api/boards/:id`

Returns full scene + metadata for one board.

Response:

```json
{
  "meta": {
    "id": "b_01",
    "title": "Project Map",
    "updatedAt": "2026-03-14T18:05:11.000Z"
  },
  "scene": {
    "type": "excalidraw",
    "version": 2,
    "source": "local-whiteboard-app",
    "elements": [],
    "appState": {},
    "files": {}
  }
}
```

### `PUT /api/boards/:id`

Updates metadata and scene.

Request:

```json
{
  "title": "Project Map",
  "scene": {
    "type": "excalidraw",
    "version": 2,
    "source": "local-whiteboard-app",
    "elements": [],
    "appState": {},
    "files": {}
  }
}
```

### `DELETE /api/boards/:id`

Deletes the board and related preview file.

## State Model

Frontend editor state:

- `board`
- `scene`
- `saveStatus`
- `isDirty`
- `lastSavedAt`

Save status values:

- `idle`
- `dirty`
- `saving`
- `saved`
- `error`

## Integration With Excalidraw

Use the official editor package to:

- render the whiteboard editor
- load saved scene data with `initialData`
- track user edits via `onChange`
- export preview images for thumbnails

This gives us the core Excalidraw interaction model without depending on the hosted website.

## Local Save Strategy

Recommended initial version:

- manual `Save` button
- optional autosave after 2 to 3 seconds idle
- save only when scene changes

This is safer than aggressive autosave in the first version and easier to reason about.

## Preview Strategy

Generate a PNG thumbnail when saving:

- frontend can export a preview image
- backend stores it under `data/previews`
- home page displays thumbnail cards

If preview generation slows down the first version, we can ship without thumbnails and add them in phase 2.

## Non-Goals For V1

- real-time collaboration
- cloud sync
- authentication
- remote share links
- direct programmatic control of `www.excalidraw.com`

## Implementation Phases

### Phase 1

- scaffold frontend and backend
- implement home page board list
- implement create, open, save, delete
- embed Excalidraw editor
- persist board JSON locally

### Phase 2

- add thumbnails
- add rename and duplicate
- add autosave
- add export actions

## Recommendation

Build Phase 1 first with:

- React + Vite frontend
- Express backend
- Excalidraw editor embedded in app
- local JSON file persistence
- simple, clean board manager UI

This is the shortest path to a stable CRUD app that feels close to Excalidraw for editing while clearly solving the local file management requirement.
