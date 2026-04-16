import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  NavLink,
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
import type { UseEventsPollHook } from "./hooks/use-events-poll.ts";
import { readPublicOrchestratorUrl } from "./lib/public-env.ts";
import { MediaSettingsPage } from "./media-settings-page.tsx";
import {
  loadMediaDetectionSettings,
  saveMediaDetectionSettings,
  type MediaDetectionSettings,
} from "./lib/media-settings.ts";
import type { CreateLocationBody, UpdateLocationBody } from "../types/locations-api.ts";
import "./styles.css";

type AppDependencies = {
  useEventsPollHook: UseEventsPollHook;
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
  baseUrl: readPublicOrchestratorUrl(),
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
    useEventsPollHook({
      baseUrl,
      userId,
      includeAllLocations: true,
    });
  const [mediaSettings, setMediaSettings] = useState<MediaDetectionSettings>(() =>
    loadMediaDetectionSettings(),
  );

  const applySettings = (next: MediaDetectionSettings) => {
    setMediaSettings(next);
    saveMediaDetectionSettings(next);
  };

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell__main">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route
            path="/events"
            element={
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
                  navigate(`/locations/${nextLocationId}/events`);
                }}
              />
            }
          />
          <Route
            path="/locations/:locationId/events"
            element={
              <LocationEventsRoute
                baseUrl={baseUrl}
                userId={userId}
                useEventsPollHook={useEventsPollHook}
                EventsScreenComponent={EventsScreenComponent}
                mediaSettings={mediaSettings}
              />
            }
          />
          <Route path="/locations/:locationId" element={<LocationEventsAliasRoute />} />
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
            path="/locations/:locationId/edit"
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
      </main>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">Home Assist</div>
        <nav className="app-nav" aria-label="Primary">
          <NavLink
            to="/events"
            className={({ isActive }) =>
              isActive ? "ui-btn app-nav__link app-nav__link--active" : "ui-btn app-nav__link"
            }
          >
            Events
          </NavLink>
          <NavLink
            to="/locations"
            className={({ isActive }) =>
              isActive ? "ui-btn app-nav__link app-nav__link--active" : "ui-btn app-nav__link"
            }
          >
            Locations
          </NavLink>
          <NavLink
            to="/settings/media"
            className={({ isActive }) =>
              isActive ? "ui-btn app-nav__link app-nav__link--active" : "ui-btn app-nav__link"
            }
          >
            Media settings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function LocationEventsRoute({
  baseUrl,
  userId,
  useEventsPollHook,
  EventsScreenComponent,
  mediaSettings,
}: {
  baseUrl: string;
  userId: number;
  useEventsPollHook: UseEventsPollHook;
  EventsScreenComponent: typeof EventsScreen;
  mediaSettings: MediaDetectionSettings;
}) {
  const navigate = useNavigate();
  const { locationId: routeLocationId } = useParams<{ locationId?: string }>();
  const parsedLocationId =
    routeLocationId != null && /^\d+$/.test(routeLocationId)
      ? Number(routeLocationId)
      : null;
  const { events, error, loading, onRefresh, newIds, pollMs } = useEventsPollHook({
    baseUrl,
    locationId: parsedLocationId ?? 1,
    userId,
  });

  if (parsedLocationId == null) {
    return <Navigate to="/locations" replace />;
  }

  return (
    <div>
      <EventsScreenComponent
        events={events}
        error={error}
        loading={loading}
        onRefresh={onRefresh}
        newIds={newIds}
        locationId={parsedLocationId}
        pollMs={pollMs}
        captureSettings={{
          audioLevelBoost: mediaSettings.audioLevelBoost,
          audioActivityThreshold: mediaSettings.audioThreshold,
          videoActivityThreshold: mediaSettings.videoThreshold,
          videoSampleCadenceMs: mediaSettings.videoCadenceMs,
          learningMatchThreshold: mediaSettings.learningThreshold,
          locationId: parsedLocationId,
          orchestratorBaseUrl: baseUrl,
        }}
        onOpenMediaSettings={() => {
          navigate("/settings/media");
        }}
        onEditLocation={() => {
          navigate(`/locations/${parsedLocationId}/edit`);
        }}
      />
    </div>
  );
}

function LocationEventsAliasRoute() {
  const { locationId: routeLocationId } = useParams<{ locationId?: string }>();
  if (routeLocationId == null || !/^\d+$/.test(routeLocationId)) {
    return <Navigate to="/locations" replace />;
  }
  return <Navigate to={`/locations/${routeLocationId}/events`} replace />;
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
