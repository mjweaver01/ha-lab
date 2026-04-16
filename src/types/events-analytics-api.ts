export const ANALYTICS_RANGES = ["15m", "1h", "6h", "24h", "7d"] as const;
export const ANALYTICS_BUCKETS = ["5m", "15m", "1h", "6h", "1d"] as const;
export const ANALYTICS_MODES = ["tail", "timeframe"] as const;

export type EventsAnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export type EventsAnalyticsBucket = (typeof ANALYTICS_BUCKETS)[number];
export type EventsAnalyticsMode = (typeof ANALYTICS_MODES)[number];

export type EventsAnalyticsQuery = {
  mode?: EventsAnalyticsMode;
  location_id?: number;
  range?: EventsAnalyticsRange;
  bucket: EventsAnalyticsBucket;
  start_at?: string;
  end_at?: string;
  event_type?: string;
};

export type EventVolumeBucket = {
  bucket_start: string;
  event_count: number;
};

export type EventTypeDistributionBucket = {
  event_type: string;
  event_count: number;
  percent: number;
};

export type ConfidenceTrendBucket = {
  bucket_start: string;
  average_confidence: number;
  sample_count: number;
};

export type EventsAnalyticsResponse = {
  scope: {
    mode: EventsAnalyticsMode;
    location_id: number | null;
    range: EventsAnalyticsRange | null;
    bucket: EventsAnalyticsBucket;
    start_at: string | null;
    end_at: string | null;
    event_type: string | null;
  };
  volumeTrend: EventVolumeBucket[];
  eventTypeDistribution: EventTypeDistributionBucket[];
  confidenceTrend: ConfidenceTrendBucket[];
  totals: {
    events: number;
    confidenceSamples: number;
    distinctEventTypes: number;
  };
};
