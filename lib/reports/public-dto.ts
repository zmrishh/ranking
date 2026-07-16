import type {
  Brand,
  QueryResult,
  Recommendation,
  ScanRun,
  ScoreSnapshot,
  TrackedPrompt,
} from "@/types/database";
import { roundForDisplay } from "@/lib/ai/scoring/score";

export type PublicReportDTO = {
  brand: {
    name: string;
    slug: string;
    domain: string;
    category: string | null;
    description: string | null;
  };
  scan: {
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    methodologyVersion: string;
    demoMode: boolean;
    providerIds: string[];
    promptCount: number;
  };
  score: {
    overall: number;
    mentionRate: number;
    averagePosition: number | null;
    shareOfVoice: number;
  };
  promptMatrix: Array<{
    prompt: string;
    promptType: string;
    mentioned: boolean;
  }>;
  topCompetitor: { name: string; mentions: number } | null;
  exampleAnswer: {
    prompt: string;
    provider: string;
    answer: string;
    citations: Array<{ url: string; title: string | null; domain: string | null }>;
  } | null;
  citationPreview: {
    url: string;
    title: string | null;
    domain: string | null;
  } | null;
  recommendation: {
    title: string;
    explanation: string;
    priority: number;
  } | null;
  premiumTeasers: {
    citationGaps: number;
    competitorOutranks: number;
    outdatedClaims: number;
    priorityActions: number;
  };
  locked: true;
};

export function toPublicReportDTO(input: {
  brand: Brand;
  scan: ScanRun;
  score: ScoreSnapshot | null;
  prompts: TrackedPrompt[];
  results: QueryResult[];
  recommendations: Recommendation[];
}): PublicReportDTO {
  const promptMatrix = input.prompts.map((prompt) => {
    const matches = input.results.filter((r) => r.tracked_prompt_id === prompt.id);
    const mentioned = matches.some((m) => m.brand_mentioned);
    return {
      prompt: prompt.prompt,
      promptType: prompt.prompt_type,
      mentioned,
    };
  });

  const competitors = (input.score?.competitor_scores as Array<{
    name: string;
    mentions: number;
  }>) ?? [];
  const topCompetitor = competitors[0]
    ? { name: competitors[0].name, mentions: competitors[0].mentions }
    : null;

  const mentionedResult =
    input.results.find((r) => r.brand_mentioned && r.raw_answer) ??
    input.results.find((r) => r.raw_answer);
  const promptForExample = input.prompts.find(
    (p) => p.id === mentionedResult?.tracked_prompt_id,
  );

  const citations = (mentionedResult?.citations as Array<{
    url: string;
    title: string | null;
    domain: string | null;
  }>) ?? [];

  const allCitations = input.results.flatMap(
    (r) =>
      (r.citations as Array<{
        url: string;
        title?: string | null;
        domain?: string | null;
        citedForBrand?: boolean;
      }>) ?? [],
  );
  const citationGaps = allCitations.filter((c) => !c.citedForBrand).length;

  const competitorOutranks = input.results.filter((r) => {
    if (r.brand_mentioned && (r.brand_position ?? 99) === 1) return false;
    const recs = (r.recommended_brands as Array<{ name: string; position: number }>) ?? [];
    return recs.some((rec) => rec.position === 1);
  }).length;

  const outdatedClaims = input.results.reduce((sum, r) => {
    const claims = (r.claims as Array<{ potentiallyOutdated?: boolean }>) ?? [];
    return sum + claims.filter((c) => c.potentiallyOutdated).length;
  }, 0);

  const firstRec = input.recommendations[0];

  return {
    brand: {
      name: input.brand.name,
      slug: input.brand.slug,
      domain: input.brand.canonical_domain,
      category: input.brand.category,
      description: input.brand.description,
    },
    scan: {
      id: input.scan.id,
      status: input.scan.status,
      createdAt: input.scan.created_at,
      completedAt: input.scan.completed_at,
      methodologyVersion: input.scan.methodology_version,
      demoMode: input.scan.demo_mode,
      providerIds: input.scan.provider_ids,
      promptCount: input.prompts.length,
    },
    score: {
      overall: roundForDisplay(Number(input.score?.overall_score ?? 0)),
      mentionRate: roundForDisplay(
        Number(input.score?.mention_rate ?? 0) * 100,
      ),
      averagePosition: input.score?.average_position
        ? roundForDisplay(Number(input.score.average_position))
        : null,
      shareOfVoice: roundForDisplay(
        Number(input.score?.share_of_voice ?? 0) * 100,
      ),
    },
    promptMatrix,
    topCompetitor,
    exampleAnswer: mentionedResult
      ? {
          prompt: promptForExample?.prompt ?? "Sample prompt",
          provider: mentionedResult.provider,
          answer: mentionedResult.raw_answer,
          citations: citations.slice(0, 5),
        }
      : null,
    citationPreview: citations[0]
      ? {
          url: citations[0].url,
          title: citations[0].title,
          domain: citations[0].domain,
        }
      : null,
    recommendation: firstRec
      ? {
          title: firstRec.title,
          explanation: firstRec.explanation,
          priority: firstRec.priority,
        }
      : null,
    premiumTeasers: {
      citationGaps,
      competitorOutranks,
      outdatedClaims,
      priorityActions: Math.max(input.recommendations.length - 1, 0),
    },
    locked: true,
  };
}
