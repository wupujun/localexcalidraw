# Local Whiteboard App

CRUD whiteboards locally using the official Excalidraw editor.

## Run

Install dependencies:

```powershell
npm.cmd install
```

Start development mode:

```powershell
npm.cmd run dev
```

Frontend:

- `http://localhost:5173`

Backend API:

- `http://localhost:3001`

Build for production:

```powershell
npm.cmd run build
```

Start the production server:

```powershell
npm.cmd start
```

## What It Does

- create a new board from the home page
- open a board in the embedded Excalidraw editor
- save board content to the local server
- list saved boards on the home page
- reopen and keep editing saved boards
- delete boards
- generate a PNG preview on save

## Local Storage

Saved board files are written under:

```text
data/
  boards/
  meta/
  previews/
```

## Notes

- the drawing editor uses `@excalidraw/excalidraw`
- the app shell around it is custom
- production build is currently large because Excalidraw ships a substantial client bundle
