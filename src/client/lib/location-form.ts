import type { CreateLocationBody, UpdateLocationBody } from "../../types/locations-api.ts";

export type LocationFormState = {
  name: string;
  code: string;
  notes: string;
};

export type LocationFormErrors = {
  name?: string;
  code?: string;
  notes?: string;
};

export const DEFAULT_LOCATION_FORM: LocationFormState = {
  name: "",
  code: "",
  notes: "",
};

export function validateLocationForm(form: LocationFormState): LocationFormErrors {
  const errors: LocationFormErrors = {};
  if (form.name.trim() === "") {
    errors.name = "Name is required.";
  }
  return errors;
}

export function toLocationWritePayload(
  form: LocationFormState,
): CreateLocationBody | UpdateLocationBody {
  const payload: CreateLocationBody = {
    name: form.name.trim(),
  };

  const code = form.code.trim();
  if (code !== "") {
    payload.code = code;
  }

  const notes = form.notes.trim();
  if (notes !== "") {
    payload.notes = notes;
  }

  return payload;
}
