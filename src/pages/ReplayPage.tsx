import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchRecording, type RecordingMeta } from "../api";

export function ReplayPage() {
  const { boardId, recordingId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recording, setRecording] = useState<RecordingMeta | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId || !recordingId) {
      return;
    }
    void loadRecording(boardId, recordingId);
  }, [boardId, recordingId]);

  async function loadRecording(nextBoardId: string, nextRecordingId: string) {
    setError(null);
    setPlaybackError(null);
    try {
      setRecording(await fetchRecording(nextBoardId, nextRecordingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load replay");
    }
  }

  const activeFrame = useMemo(() => {
    if (!recording || recording.frames.length === 0) {
      return null;
    }
    let current = recording.frames[0];
    for (const frame of recording.frames) {
      if (frame.timestampMs <= currentTimeMs) {
        current = frame;
      } else {
        break;
      }
    }
    return current;
  }, [currentTimeMs, recording]);

  if (!boardId || !recordingId) {
    return <div className="replay-shell">Missing replay id.</div>;
  }

  if (error) {
    return <div className="replay-shell">{error}</div>;
  }

  if (!recording) {
    return <div className="replay-shell">Loading replay...</div>;
  }

  const isPlayableInBrowser = canPlayRecording(recording);

  return (
    <div className="replay-shell">
      <header className="editor-header">
        <button className="secondary-button" onClick={() => navigate(`/boards/${boardId}/edit`)}>
          Back To Board
        </button>
        <div>
          <p className="eyebrow">Interview Replay</p>
          <h2>{recording.title}</h2>
        </div>
        <span className="save-pill saved">{Math.round(recording.durationMs / 1000)}s replay</span>
      </header>

      <main className="replay-layout">
        <section className="replay-canvas">
          {activeFrame ? (
            <img src={activeFrame.imagePath} alt={recording.title} className="replay-image" />
          ) : (
            <div className="replay-placeholder">No frames available.</div>
          )}
        </section>
        <aside className="replay-sidebar">
          <audio
            ref={audioRef}
            controls
            className="replay-audio"
            onError={() => setPlaybackError("This browser cannot play the saved replay audio format.")}
            onTimeUpdate={() => setCurrentTimeMs((audioRef.current?.currentTime ?? 0) * 1000)}
          >
            <source src={recording.audioPath} type={recording.audioMimeType} />
          </audio>
          {!isPlayableInBrowser ? (
            <div className="editor-banner error">
              This replay was saved as `{recording.audioMimeType}` and this browser does not report support for that format.
            </div>
          ) : null}
          {playbackError ? <div className="editor-banner error">{playbackError}</div> : null}
          <p className="muted">{recording.frames.length} screenshots captured during the walkthrough.</p>
          <div className="replay-frames">
            {recording.frames.map((frame) => (
              <button
                key={`${frame.imagePath}-${frame.timestampMs}`}
                className={`replay-frame-button ${activeFrame?.imagePath === frame.imagePath ? "selected" : ""}`}
                onClick={() => {
                  if (!audioRef.current) {
                    return;
                  }

                  audioRef.current.currentTime = frame.timestampMs / 1000;
                  void audioRef.current.play().catch(() => {
                    setPlaybackError("Replay audio could not start in this browser.");
                  });
                }}
              >
                <span>{Math.round(frame.timestampMs / 1000)}s</span>
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function canPlayRecording(recording: RecordingMeta) {
  if (typeof document === "undefined") {
    return true;
  }

  const audio = document.createElement("audio");
  return audio.canPlayType(recording.audioMimeType) !== "";
}
