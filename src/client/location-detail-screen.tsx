import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import type { CreateLocationBody, UpdateLocationBody } from "../types/locations-api.ts";
import {
  DEFAULT_LOCATION_FORM,
  toLocationWritePayload,
  validateLocationForm,
  type LocationFormState,
} from "./lib/location-form.ts";

export type LocationDetailScreenProps = {
  mode: "create" | "edit";
  locationId?: number | null;
  initialForm?: Partial<LocationFormState>;
  submitLabel?: string;
  onBackToLocations: () => void;
  onSubmitLocation: (payload: CreateLocationBody | UpdateLocationBody) => Promise<void>;
};

function buildInitialForm(initialForm: Partial<LocationFormState> | undefined): LocationFormState {
  return {
    ...DEFAULT_LOCATION_FORM,
    ...initialForm,
  };
}

export function LocationDetailScreen({
  mode,
  locationId,
  initialForm,
  submitLabel,
  onBackToLocations,
  onSubmitLocation,
}: LocationDetailScreenProps) {
  const [form, setForm] = useState<LocationFormState>(() => buildInitialForm(initialForm));
  const [errors, setErrors] = useState(validateLocationForm(form));
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pageTitle = mode === "create" ? "Create location" : "Edit location";

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">{pageTitle}</h1>
          {mode === "edit" && locationId != null ? (
            <p className="ui-page-meta">Location ID: {locationId}</p>
          ) : null}
        </div>
        <div className="ui-page-actions">
          <button type="button" className="ui-btn ui-btn--with-icon" onClick={onBackToLocations}>
            <span className="ui-btn__icon" aria-hidden>
              <ArrowLeft size={16} />
            </span>
            Back to locations
          </button>
        </div>
      </div>

      {requestError != null ? (
        <div className="ui-alert ui-alert--error" role="alert">
          {requestError}
        </div>
      ) : null}

      <form
        className="ui-panel locations-form"
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validateLocationForm(form);
          setErrors(nextErrors);
          if (nextErrors.name != null) {
            return;
          }

          setSubmitting(true);
          setRequestError(null);
          const payload = toLocationWritePayload(form);
          void onSubmitLocation(payload)
            .catch(() => {
              setRequestError("Request failed. Try again.");
            })
            .finally(() => {
              setSubmitting(false);
            });
        }}
      >
        <label className="media-capture__field">
          <span>Name</span>
          <input
            className="media-capture__input"
            value={form.name}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((prev) => ({ ...prev, name: value }));
              setErrors((prev) => ({
                ...prev,
                name: value.trim() === "" ? "Name is required." : undefined,
              }));
            }}
          />
          {errors.name != null ? <span className="locations-field-error">{errors.name}</span> : null}
        </label>

        <label className="media-capture__field">
          <span>Code</span>
          <input
            className="media-capture__input"
            value={form.code}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((prev) => ({ ...prev, code: value }));
            }}
          />
        </label>

        <label className="media-capture__field">
          <span>Notes</span>
          <textarea
            className="media-capture__input locations-notes"
            value={form.notes}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((prev) => ({ ...prev, notes: value }));
            }}
          />
        </label>

        <div className="locations-form-actions">
          <button type="submit" className="ui-btn ui-btn--with-icon" disabled={submitting}>
            <span className="ui-btn__icon" aria-hidden>
              <Save size={16} />
            </span>
            {submitLabel ?? pageTitle}
          </button>
        </div>
      </form>
    </div>
  );
}
