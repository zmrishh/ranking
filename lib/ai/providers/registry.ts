import type { ProviderId } from "@/types/database";
import { geminiSearchProvider } from "./gemini";
import { openaiSearchProvider } from "./openai";
import { perplexitySearchProvider } from "./perplexity";
import type { AISearchProvider, ProviderQueryResult } from "./types";

const PROVIDERS: Record<ProviderId, AISearchProvider> = {
  openai: openaiSearchProvider,
  gemini: geminiSearchProvider,
  perplexity: perplexitySearchProvider,
};

export function getProvider(id: ProviderId): AISearchProvider {
  return PROVIDERS[id];
}

export function listProviders(): AISearchProvider[] {
  return Object.values(PROVIDERS);
}

export async function runProvidersIsolated(
  providerIds: ProviderId[],
  query: string,
  options?: { country?: string; language?: string },
): Promise<ProviderQueryResult[]> {
  const results = await Promise.all(
    providerIds.map(async (id) => {
      try {
        return await getProvider(id).runQuery({
          query,
          country: options?.country,
          language: options?.language,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Provider failed unexpectedly";
        return {
          provider: id,
          model: "unknown",
          query,
          rawAnswer: "",
          citations: [],
          sources: [],
          latencyMs: 0,
          usage: {},
          error: message,
          timestamp: new Date().toISOString(),
          isDemo: false,
        } satisfies ProviderQueryResult;
      }
    }),
  );
  return results;
}
