import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
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

function AppRoutes({ deps }: { deps: AppDependencies }) {
  const navigate = useNavigate();
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
  const { events, error, loading, onRefresh, newIds, locationId, pollMs } =
    useEventsPollHook();
  const [mediaSettings, setMediaSettings] = useState<MediaDetectionSettings>(() =>
    loadMediaDetectionSettings(),
  );

  const applySettings = (next: MediaDetectionSettings) => {
    setMediaSettings(next);
    saveMediaDetectionSettings(next);
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/events" replace />} />
      <Route
        path="/events"
        element={
          <div>
            <div className="events-toolbar">
              <button
                type="button"
                className="events-btn"
                onClick={() => {
                  navigate("/locations");
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
              locationId={locationId}
              pollMs={pollMs}
              captureSettings={{
                audioLevelBoost: mediaSettings.audioLevelBoost,
                audioActivityThreshold: mediaSettings.audioThreshold,
                videoActivityThreshold: mediaSettings.videoThreshold,
                videoSampleCadenceMs: mediaSettings.videoCadenceMs,
                learningMatchThreshold: mediaSettings.learningThreshold,
              }}
              onOpenMediaSettings={() => {
                navigate("/settings/media");
              }}
            />
          </div>
        }
      />
      <Route
        path="/locations"
        element={
          <LocationsScreenComponent
            baseUrl={baseUrl}
            userId={userId}
            onCreateLocation={() => {
              navigate("/locations/new");
            }}
            onOpenLocation={(nextLocationId) => {
              navigate(`/locations/${nextLocationId}`);
            }}
          />
        }
      />
      <Route
        path="/locations/new"
        element={
          <LocationDetailScreenComponent
            mode="create"
            locationId={null}
            onBackToLocations={() => {
              navigate("/locations");
            }}
            onSubmitLocation={async (payload: CreateLocationBody | UpdateLocationBody) => {
              await createLocationFn({ baseUrl, userId, body: payload });
              navigate("/locations");
            }}
          />
        }
      />
      <Route
        path="/locations/:locationId"
        element={
          <LocationEditRoute
            LocationDetailScreenComponent={LocationDetailScreenComponent}
            baseUrl={baseUrl}
            userId={userId}
            updateLocationFn={updateLocationFn}
          />
        }
      />
      <Route
        path="/settings/media"
        element={
          <MediaSettingsPage
            settings={mediaSettings}
            onChangeSettings={applySettings}
            onBackToEvents={() => {
              navigate("/events");
            }}
          />
        }
      />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}

function LocationEditRoute({
  LocationDetailScreenComponent,
  baseUrl,
  userId,
  updateLocationFn,
}: {
  LocationDetailScreenComponent: typeof LocationDetailScreen;
  baseUrl: string;
  userId: number;
  updateLocationFn: typeof updateLocation;
}) {
  const navigate = useNavigate();
  const { locationId: routeLocationId } = useParams<{ locationId?: string }>();
  const locationId =
    routeLocationId != null && /^\d+$/.test(routeLocationId)
      ? Number(routeLocationId)
      : null;

  return (
    <LocationDetailScreenComponent
      mode="edit"
      locationId={locationId}
      onBackToLocations={() => {
        navigate("/locations");
      }}
      onSubmitLocation={async (payload: CreateLocationBody | UpdateLocationBody) => {
        if (locationId != null) {
          await updateLocationFn({
            baseUrl,
            userId,
            locationId,
            body: payload,
          });
        }
        navigate("/locations");
      }}
    />
  );
}

export function App({ deps }: AppProps = {}) {
  const resolvedDeps = { ...defaultDeps, ...deps };
  return (
    <BrowserRouter>
      <AppRoutes deps={resolvedDeps} />
    </BrowserRouter>
  );
}

if (typeof document !== "undefined") {
  const rootEl = document.getElementById("root");
  if (rootEl == null) {
    throw new Error("missing #root");
  }
  createRoot(rootEl).render(<App />);
}
