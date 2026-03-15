import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { EditorPage } from "./pages/EditorPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/boards/:boardId/edit" element={<EditorPage />} />
    </Routes>
  );
}
