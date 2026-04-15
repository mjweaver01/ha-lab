export type LearnedVideoSample = {
  id: string;
  label: string;
  created_at: string;
  feature: [number, number, number];
};

export type LearnedVideoMatch = {
  label: string;
  score: number;
};

const LEARNING_STORAGE_KEY = "home-assist.media-learning.v1";
const MAX_DISTANCE = Math.sqrt(3);

function normalizeChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function normalizeLabel(raw: string): string {
  const label = raw.trim();
  return label.length > 0 ? label : "unlabeled";
}

export function createVideoFrameFeature(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): [number, number, number] | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const sampleSize = 32;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx == null) {
    return null;
  }

  ctx.drawImage(video, 0, 0, sampleSize, sampleSize);
  const image = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = image.data;
  if (data.length === 0) {
    return null;
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let pixelCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i] ?? 0;
    sumG += data[i + 1] ?? 0;
    sumB += data[i + 2] ?? 0;
    pixelCount += 1;
  }

  if (pixelCount <= 0) {
    return null;
  }

  return [
    normalizeChannel(sumR / (pixelCount * 255)),
    normalizeChannel(sumG / (pixelCount * 255)),
    normalizeChannel(sumB / (pixelCount * 255)),
  ];
}

function scoreFeatureMatch(
  input: [number, number, number],
  sample: [number, number, number],
): number {
  const dr = input[0] - sample[0];
  const dg = input[1] - sample[1];
  const db = input[2] - sample[2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  const normalized = Math.min(1, distance / MAX_DISTANCE);
  return 1 - normalized;
}

export function matchLearnedVideoLabel(
  feature: [number, number, number],
  samples: readonly LearnedVideoSample[],
): LearnedVideoMatch | null {
  if (samples.length === 0) {
    return null;
  }

  let bestLabel = "";
  let bestScore = 0;
  for (const sample of samples) {
    const score = scoreFeatureMatch(feature, sample.feature);
    if (score > bestScore) {
      bestScore = score;
      bestLabel = normalizeLabel(sample.label);
    }
  }

  if (bestLabel === "") {
    return null;
  }

  return {
    label: bestLabel,
    score: bestScore,
  };
}

export function createLearnedVideoSample(
  label: string,
  feature: [number, number, number],
): LearnedVideoSample {
  const timestamp = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: normalizeLabel(label),
    created_at: timestamp,
    feature: feature.map(normalizeChannel) as [number, number, number],
  };
}

export function loadLearnedVideoSamples(): LearnedVideoSample[] {
  if (typeof window === "undefined" || window.localStorage == null) {
    return [];
  }

  const raw = window.localStorage.getItem(LEARNING_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (
          entry == null ||
          typeof entry !== "object" ||
          !("id" in entry) ||
          !("label" in entry) ||
          !("feature" in entry)
        ) {
          return null;
        }
        const maybeFeature = (entry as { feature?: unknown }).feature;
        if (
          !Array.isArray(maybeFeature) ||
          maybeFeature.length !== 3 ||
          maybeFeature.some((v) => typeof v !== "number")
        ) {
          return null;
        }
        return {
          id: String((entry as { id: unknown }).id),
          label: normalizeLabel(String((entry as { label: unknown }).label)),
          created_at: String(
            (entry as { created_at?: unknown }).created_at ?? new Date().toISOString(),
          ),
          feature: [
            normalizeChannel(maybeFeature[0]),
            normalizeChannel(maybeFeature[1]),
            normalizeChannel(maybeFeature[2]),
          ] as [number, number, number],
        } satisfies LearnedVideoSample;
      })
      .filter((entry): entry is LearnedVideoSample => entry != null);
  } catch {
    return [];
  }
}

export function saveLearnedVideoSamples(samples: readonly LearnedVideoSample[]): void {
  if (typeof window === "undefined" || window.localStorage == null) {
    return;
  }
  window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(samples));
}
