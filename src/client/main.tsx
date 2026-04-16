import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createLocation, updateLocation } from "./api/locations-client.ts";
import { EventsScreen } from "./events-screen.tsx";
import { LocationDetailScreen } from "./location-detail-screen.tsx";
import { LocationsScreen } from "./locations-screen.tsx";
import { useEventsPoll } from "./hooks/use-events-poll.ts";
import { MediaSettingsPage } from "./media-settings-page.tsx";
import {
  loadMediaDetectionSettings,
  saveMediaDetectionSettings,
  type MediaDetectionSettings,
} from "./lib/media-settings.ts";
import type { CreateLocationBody, UpdateLocationBody } from "../types/locations-api.ts";
import "./styles.css";

type AppScreen = "events" | "settings" | "locations" | "location-detail";

type AppDependencies = {
  useEventsPollHook: typeof useEventsPoll;
  EventsScreenComponent: typeof EventsScreen;
  LocationsScreenComponent: typeof LocationsScreen;
  LocationDetailScreenComponent: typeof LocationDetailScreen;
  createLocationFn: typeof createLocation;
  updateLocationFn: typeof updateLocation;
  baseUrl: string;
  userId: number;
};

type AppProps = {
  deps?: Partial<AppDependencies>;
};

const defaultDeps: AppDependencies = {
  useEventsPollHook: useEventsPoll,
  EventsScreenComponent: EventsScreen,
  LocationsScreenComponent: LocationsScreen,
  LocationDetailScreenComponent: LocationDetailScreen,
  createLocationFn: createLocation,
  updateLocationFn: updateLocation,
  baseUrl: "http://localhost:3000",
  userId: 1,
};

export function App({ deps }: AppProps = {}) {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const {
    useEventsPollHook,
    EventsScreenComponent,
    LocationsScreenComponent,
    LocationDetailScreenComponent,
    createLocationFn,
    updateLocationFn,
    baseUrl,
    userId,
  } = resolvedDeps;
  const { events, error, loading, onRefresh, newIds, homeId, pollMs } =
    useEventsPollHook();
  const [screen, setScreen] = useState<AppScreen>("events");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locationDetailMode, setLocationDetailMode] = useState<"create" | "edit">("create");
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

  if (screen === "locations") {
    return (
      <LocationsScreenComponent
        baseUrl={baseUrl}
        userId={userId}
        onCreateLocation={() => {
          setSelectedLocationId(null);
          setLocationDetailMode("create");
          setScreen("location-detail");
        }}
        onOpenLocation={(locationId) => {
          setSelectedLocationId(locationId);
          setLocationDetailMode("edit");
          setScreen("location-detail");
        }}
      />
    );
  }

  if (screen === "location-detail") {
    return (
      <LocationDetailScreenComponent
        mode={locationDetailMode}
        locationId={selectedLocationId}
        onBackToLocations={() => {
          setScreen("locations");
        }}
        onSubmitLocation={async (payload: CreateLocationBody | UpdateLocationBody) => {
          if (locationDetailMode === "create") {
            const created = await createLocationFn({ baseUrl, userId, body: payload });
            setSelectedLocationId(created.id);
          } else if (selectedLocationId != null) {
            await updateLocationFn({
              baseUrl,
              userId,
              locationId: selectedLocationId,
              body: payload,
            });
          } else {
            const created = await createLocationFn({ baseUrl, userId, body: payload });
            setSelectedLocationId(created.id);
          }
          setScreen("locations");
        }}
      />
    );
  }

  return (
    <div>
      <div className="events-toolbar">
        <button
          type="button"
          className="events-btn"
          onClick={() => {
            setScreen("locations");
          }}
        >
          Locations
        </button>
      </div>
      <EventsScreenComponent
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
    </div>
  );
}

if (typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl == null) {
    throw new Error("missing #root");
  }
  createRoot(rootEl).render(<App />);
}
