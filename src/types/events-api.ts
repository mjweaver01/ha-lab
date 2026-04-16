/** Locked JSON contract for POST /events (Phase 2). */
export type PostEventBody = {
  location_id: number;
  event_type: string;
  body?: unknown;
};

/** Subscriber registration for POST /subscribers (Phase 2). */
export type PostSubscriberBody = {
  location_id: number;
  callback_url: string;
};
