export const APP_NAME = "RankedByAI";
export const APP_TAGLINE = "Does AI recommend your company?";
export const METHODOLOGY_VERSION = "v1.0.0";

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export function providerDisplayName(id: string): string {
  return PROVIDER_DISPLAY_NAMES[id] ?? id;
}

export const SUPPORTED_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "in", label: "India" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
  { code: "br", label: "Brazil" },
  { code: "jp", label: "Japan" },
  { code: "es", label: "Spain" },
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
] as const;

export const FREE_SCAN_CACHE_DAYS = Number(
  process.env.FREE_SCAN_CACHE_DAYS ?? "30",
);
export const FREE_PROMPT_COUNT = 10;
export const MAX_PROVIDER_ANSWER_CHARS = Number(
  process.env.MAX_PROVIDER_ANSWER_CHARS ?? "20000",
);
export const SCAN_COST_CEILING_USD = Number(
  process.env.SCAN_COST_CEILING_USD ?? "2.50",
);
export const PROVIDER_CONCURRENCY = Number(
  process.env.PROVIDER_CONCURRENCY ?? "3",
);

export const SCORE_WEIGHTS = {
  mention: 0.55,
  position: 0.25,
  citation: 0.15,
  sentiment: 0.05,
} as const;

export const POSITION_SCORES: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
};

export const SENTIMENT_SCORES = {
  positive: 100,
  neutral: 60,
  mixed: 40,
  negative: 10,
} as const;
