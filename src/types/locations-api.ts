export type LocationListItem = {
  id: number;
  name: string;
  code: string | null;
  notes: string | null;
  archived_at: string | null;
  updated_at: string;
};

export type CreateLocationBody = {
  name: string;
  code?: string;
  notes?: string;
};

export type UpdateLocationBody = {
  name: string;
  code?: string;
  notes?: string;
};

export type LocationLifecycleAction = "archive" | "restore";
