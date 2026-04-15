import { useState } from "react";
import { createRoot } from "react-dom/client";
import { EventsScreen } from "./events-screen.tsx";
import { useEventsPoll } from "./hooks/use-events-poll.ts";
import { MediaSettingsPage } from "./media-settings-page.tsx";
import {
  loadMediaDetectionSettings,
  saveMediaDetectionSettings,
  type MediaDetectionSettings,
} from "./lib/media-settings.ts";
import "./styles.css";

function App() {
  const { events, error, loading, onRefresh, newIds, homeId, pollMs } =
    useEventsPoll();
  const [screen, setScreen] = useState<"events" | "settings">("events");
  const [mediaSettings, setMediaSettings] = useState<MediaDetectionSettings>(() =>
    loadMediaDetectionSettings(),
  );

  const applySettings = (next: MediaDetectionSettings) => {
    setMediaSettings(next);
    saveMediaDetectionSettings(next);
  };

  if (screen === "settings") {
    return (
      <MediaSettingsPage
        settings={mediaSettings}
        onChangeSettings={applySettings}
        onBackToEvents={() => {
          setScreen("events");
        }}
      />
    );
  }

  return (
    <EventsScreen
      events={events}
      error={error}
      loading={loading}
      onRefresh={onRefresh}
      newIds={newIds}
      homeId={homeId}
      pollMs={pollMs}
      captureSettings={{
        audioLevelBoost: mediaSettings.audioLevelBoost,
        audioActivityThreshold: mediaSettings.audioThreshold,
        videoActivityThreshold: mediaSettings.videoThreshold,
        videoSampleCadenceMs: mediaSettings.videoCadenceMs,
        learningMatchThreshold: mediaSettings.learningThreshold,
      }}
      onOpenMediaSettings={() => {
        setScreen("settings");
      }}
    />
  );
}

const rootEl = document.getElementById("root");
if (rootEl == null) {
  throw new Error("missing #root");
}

createRoot(rootEl).render(<App />);
