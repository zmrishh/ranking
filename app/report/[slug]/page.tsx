import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Lightbulb,
  Link2,
  Lock,
  MessageSquareQuote,
} from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareControls } from "@/components/report/share-controls";
import { ScoreRing } from "@/components/report/score-ring";
import {
  getBrandBySlug,
  getCachedFreeScan,
  getPrompts,
  getQueryResults,
  getRecommendations,
  getScoreForScan,
} from "@/lib/db/repository";
import { toPublicReportDTO, type PublicReportDTO } from "@/lib/reports/public-dto";
import { APP_NAME, providerDisplayName } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

async function loadReport(slug: string): Promise<PublicReportDTO | null> {
  const brand = await getBrandBySlug(slug);
  if (!brand || brand.visibility !== "public") return null;

  const cached = await getCachedFreeScan(brand.canonical_domain);
  if (!cached) return null;

  const [prompts, results, score, recommendations] = await Promise.all([
    getPrompts(brand.id),
    getQueryResults(cached.scan.id),
    getScoreForScan(cached.scan.id),
    getRecommendations(brand.id),
  ]);

  return toPublicReportDTO({
    brand,
    scan: cached.scan,
    score: score ?? cached.score,
    prompts,
    results,
    recommendations: recommendations.filter(
      (r) => r.scan_run_id === cached.scan.id,
    ),
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await loadReport(slug);
  if (!report) {
    return { title: "Report not found", robots: { index: false } };
  }
  return {
    title: `${report.brand.name} AI Visibility Report`,
    description: `${report.brand.name} scored ${report.score.overall} on ${APP_NAME}. Mention rate ${report.score.mentionRate}%.`,
    openGraph: {
      title: `${report.brand.name} · Score ${report.score.overall}`,
      description: `Mention rate ${report.score.mentionRate}% · ${APP_NAME}`,
    },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand || brand.visibility === "private") notFound();

  const report = await loadReport(slug);

  if (!report) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-24 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Report unavailable
          </h1>
          <p className="mt-3 text-muted-foreground">
            No completed public scan was found for this brand yet, or the
            cached report has expired.
          </p>
          <Button asChild className="mt-8">
            <Link
              href={
                (await getSessionUser())
                  ? routes.newScan()
                  : routes.publicScanAnchor
              }
            >
              Run a free scan
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </main>
        <SiteFooter />
      </>
    );
  }

  const teasers = [
    {
      count: report.premiumTeasers.citationGaps,
      label: "citation gaps detected",
    },
    {
      count: report.premiumTeasers.competitorOutranks,
      label: "purchase-intent questions where competitors outrank you",
    },
    {
      count: report.premiumTeasers.outdatedClaims,
      label: "potentially outdated claims found",
    },
    {
      count: report.premiumTeasers.priorityActions,
      label: "priority actions available",
    },
  ];

  const mentionedCount = report.promptMatrix.filter((r) => r.mentioned).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Score header */}
        <section className="relative overflow-hidden border-b border-border bg-[color:var(--rb-ink)]">
          <div className="rb-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,black,transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[color:var(--rb-blue)] text-white hover:bg-[color:var(--rb-blue)]">
                Public report
              </Badge>
              {report.scan.demoMode ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--rb-amber)]/40 text-[color:var(--rb-amber)]"
                >
                  Demo fixtures
                </Badge>
              ) : null}
              <span className="text-xs text-white/50">
                Scanned {new Date(report.scan.createdAt).toLocaleDateString()} ·
                methodology {report.scan.methodologyVersion}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  {report.brand.name}
                </h1>
                <p className="mt-2 font-mono text-sm text-white/50">
                  {report.brand.domain}
                  {report.brand.category ? ` · ${report.brand.category}` : ""}
                </p>
                <div className="mt-8 grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                      Mention rate
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white md:text-4xl">
                      {report.score.mentionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                      Avg position
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white md:text-4xl">
                      {report.score.averagePosition ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                      Top competitor
                    </p>
                    <p className="mt-1 truncate text-2xl font-semibold text-white capitalize md:text-3xl">
                      {report.topCompetitor?.name ?? "None"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <ScoreRing score={report.score.overall} />
              </div>
            </div>

            <div className="mt-10">
              <ShareControls
                slug={report.brand.slug}
                brandName={report.brand.name}
                score={report.score.overall}
              />
            </div>
          </div>
        </section>

        {/* Prompt matrix */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Prompt results
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mentioned in {mentionedCount} of {report.promptMatrix.length}{" "}
                buyer questions across{" "}
                {report.scan.providerIds.map(providerDisplayName).join(", ")}
                .
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <div className="divide-y divide-border">
              {report.promptMatrix.map((row) => (
                <div
                  key={row.prompt}
                  className="flex items-center justify-between gap-4 bg-card px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.prompt}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {row.promptType}
                    </p>
                  </div>
                  {row.mentioned ? (
                    <Badge className="shrink-0 rounded-full bg-[color:var(--rb-green)]/10 text-[color:var(--rb-green)] hover:bg-[color:var(--rb-green)]/10">
                      Mentioned
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-full text-muted-foreground"
                    >
                      Not mentioned
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example answer + citation + action */}
        <section className="border-y border-border bg-[color:var(--rb-mist)]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-2 md:px-6">
            <div className="rb-panel p-6">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="size-4 text-muted-foreground" />
                <h2 className="font-semibold tracking-tight">
                  Example AI answer
                </h2>
              </div>
              {report.exampleAnswer ? (
                <div className="mt-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    {report.exampleAnswer.provider.toUpperCase()} ·{" "}
                    {report.exampleAnswer.prompt}
                  </p>
                  <p className="mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {report.exampleAnswer.answer}
                  </p>
                  {report.exampleAnswer.citations.length > 0 ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Cited sources
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {report.exampleAnswer.citations.map((c) => (
                          <li key={c.url}>
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-[color:var(--rb-blue)] hover:underline"
                            >
                              <ExternalLink className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {c.title || c.domain || c.url}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No sample answer available for this scan.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="rb-panel p-6">
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h2 className="font-semibold tracking-tight">
                    Citation example
                  </h2>
                </div>
                {report.citationPreview ? (
                  <a
                    href={report.citationPreview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <p className="truncate text-sm font-medium text-[color:var(--rb-blue)]">
                      {report.citationPreview.title ||
                        report.citationPreview.url}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {report.citationPreview.domain}
                    </p>
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No citation preview for this free report.
                  </p>
                )}
              </div>

              <div className="flex-1 rb-panel p-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-muted-foreground" />
                  <h2 className="font-semibold tracking-tight">
                    Free recommended action
                  </h2>
                </div>
                {report.recommendation ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium">
                      {report.recommendation.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {report.recommendation.explanation}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No recommendation generated for this scan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Premium teasers */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Locked premium insights
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Counts are computed server-side — locked details never ship in
                this page&apos;s payload.
              </p>
            </div>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/pricing">
                Unlock
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {teasers.map((teaser) => (
              <div
                key={teaser.label}
                className="rb-card-hover relative overflow-hidden rb-panel p-6"
              >
                <div className="flex items-start justify-between">
                  <p className="text-3xl font-semibold tracking-tight">
                    {teaser.count}
                  </p>
                  <span className="flex size-7 items-center justify-center rounded-full border border-border bg-muted">
                    <Lock className="size-3.5 text-muted-foreground" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {teaser.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="border-t border-border bg-[color:var(--rb-mist)]">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Methodology &amp; limitations
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This report samples provider APIs — labelled OpenAI, Gemini, and
              Perplexity — with live web search or grounding where configured.
              Results are not identical to consumer ChatGPT, Gemini, or
              Perplexity interfaces and may vary between runs. Sample size:{" "}
              {report.scan.promptCount} prompts ×{" "}
              {report.scan.providerIds.length} provider(s). Methodology{" "}
              {report.scan.methodologyVersion}.{" "}
              <Link
                href="/methodology"
                className="text-foreground underline underline-offset-4"
              >
                Read the full methodology
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Claim + upgrade CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Is this your company?
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Claim this report to own it, control visibility, track changes
                over time, and unlock the full action centre.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/claim/${report.brand.slug}`}>
                  Claim this brand
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pricing">View plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
