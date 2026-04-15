/** Locked JSON contract for POST /events (Phase 2). */
export type PostEventBody = {
  home_id: number;
  event_type: string;
  body?: unknown;
};

/** Subscriber registration for POST /subscribers (Phase 2). */
export type PostSubscriberBody = {
  home_id: number;
  callback_url: string;
};
