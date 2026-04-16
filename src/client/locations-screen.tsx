import { useEffect, useMemo, useState } from "react";
import { Archive, FolderOpen, Plus, RotateCcw } from "lucide-react";
import {
  archiveLocation,
  fetchLocations,
  restoreLocation,
  type LocationListItem,
} from "./api/locations-client.ts";

export type LocationsScreenProps = {
  baseUrl: string;
  userId: number;
  onOpenLocation: (locationId: number) => void;
  onCreateLocation?: () => void;
  api?: {
    fetchLocations: typeof fetchLocations;
    archiveLocation: typeof archiveLocation;
    restoreLocation: typeof restoreLocation;
  };
};

const ARCHIVE_COPY =
  "Archive this location? It will be removed from active views and kept for audit history. You can restore it later.";
const INCLUDE_ARCHIVED_KEY = "locations.includeArchived";

function sortByUpdated(rows: readonly LocationListItem[]): LocationListItem[] {
  return [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function readIncludeArchivedPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(INCLUDE_ARCHIVED_KEY) === "1";
}

function writeIncludeArchivedPreference(includeArchived: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(INCLUDE_ARCHIVED_KEY, includeArchived ? "1" : "0");
}

export function LocationsScreen({
  baseUrl,
  userId,
  onOpenLocation,
  onCreateLocation,
  api = {
    fetchLocations,
    archiveLocation,
    restoreLocation,
  },
}: LocationsScreenProps) {
  const [includeArchived, setIncludeArchived] = useState(readIncludeArchivedPreference);
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const sortedLocations = useMemo(() => sortByUpdated(locations), [locations]);

  const loadLocations = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.fetchLocations({ baseUrl, userId, includeArchived });
      setLocations(rows);
    } catch {
      // Do not leak location identifiers from backend errors.
      setError("Could not load locations. Refresh and confirm the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLocations();
  }, [baseUrl, userId, includeArchived]);

  useEffect(() => {
    writeIncludeArchivedPreference(includeArchived);
  }, [includeArchived]);

  const onArchive = async (locationId: number): Promise<void> => {
    const confirmed = window.confirm(`Archive location: ${ARCHIVE_COPY}`);
    if (!confirmed) {
      return;
    }

    setBusyId(locationId);
    setError(null);
    try {
      await api.archiveLocation({
        baseUrl,
        userId,
        locationId,
        archiveReason: "Archived from locations hub",
      });
      await loadLocations();
    } catch {
      setError("Could not load locations. Refresh and confirm the server is running.");
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async (locationId: number): Promise<void> => {
    setBusyId(locationId);
    setError(null);
    try {
      await api.restoreLocation({
        baseUrl,
        userId,
        locationId,
      });
      await loadLocations();
    } catch {
      setError("Could not load locations. Refresh and confirm the server is running.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">Locations</h1>
          <p className="ui-page-meta">Manage lifecycle state and open location detail surfaces.</p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn ui-btn--with-icon"
            onClick={() => {
              onCreateLocation?.();
            }}
          >
            <span className="ui-btn__icon" aria-hidden>
              <Plus size={16} />
            </span>
            Create location
          </button>
        </div>
      </div>

      <div className="ui-panel locations-toolbar">
        <label className="locations-include-archived">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => {
              setIncludeArchived(event.currentTarget.checked);
            }}
          />
          <span>Include archived</span>
        </label>
      </div>

      {error != null ? (
        <div className="ui-alert ui-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {loading && locations.length === 0 ? (
        <p className="ui-loading" aria-busy="true">
          Loading locations...
        </p>
      ) : null}

      {!loading && sortedLocations.length === 0 && error == null ? (
        <div className="ui-panel">
          <div className="ui-empty">
            <h2 className="ui-empty__title">No locations yet</h2>
            <p className="ui-empty__body">
              Create your first location to organize devices, memberships, and event access.
            </p>
          </div>
        </div>
      ) : null}

      {sortedLocations.length > 0 ? (
        <div className="ui-panel">
          <table className="ui-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">Code</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((location) => {
                const isArchived = location.archived_at != null;
                const isBusy = busyId === location.id;
                return (
                  <tr
                    key={location.id}
                    className={isArchived ? "ui-table-row ui-table-row--muted" : "ui-table-row"}
                    onClick={() => onOpenLocation(location.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenLocation(location.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{location.name}</td>
                    <td>{isArchived ? "Archived" : "Active"}</td>
                    <td>{location.updated_at}</td>
                    <td>{location.code ?? "—"}</td>
                    <td>
                      <div className="ui-inline-actions">
                        <button
                          type="button"
                          className="ui-btn ui-btn--with-icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenLocation(location.id);
                          }}
                        >
                          <span className="ui-btn__icon" aria-hidden>
                            <FolderOpen size={16} />
                          </span>
                          Open
                        </button>
                        {isArchived ? (
                          <button
                            type="button"
                            className="ui-btn ui-btn--with-icon"
                            disabled={isBusy}
                            onClick={(event) => {
                              event.stopPropagation();
                              void onRestore(location.id);
                            }}
                          >
                            <span className="ui-btn__icon" aria-hidden>
                              <RotateCcw size={16} />
                            </span>
                            Restore location
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ui-btn ui-btn--destructive ui-btn--with-icon"
                            disabled={isBusy}
                            onClick={(event) => {
                              event.stopPropagation();
                              void onArchive(location.id);
                            }}
                          >
                            <span className="ui-btn__icon" aria-hidden>
                              <Archive size={16} />
                            </span>
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
