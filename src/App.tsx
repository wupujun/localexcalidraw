import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { EditorPage } from "./pages/EditorPage";
import { ReplayPage } from "./pages/ReplayPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boards/:boardId/edit" element={<EditorPage />} />
      <Route path="/boards/:boardId/replays/:recordingId" element={<ReplayPage />} />
    </Routes>
  );
}
