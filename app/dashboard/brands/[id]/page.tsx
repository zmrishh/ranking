import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import {
  getBrandById,
  getCompetitors,
  getPrompts,
  getRecommendations,
  scoresForBrand,
} from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roundForDisplay } from "@/lib/ai/scoring/score";
import { RescanButton } from "@/components/dashboard/rescan-button";
import { BrandNav } from "@/components/dashboard/brand-nav";
import { routes } from "@/lib/routes";
import { getBrandMonitoringSettings } from "@/lib/db/repository";
import { nextScheduledScanLabel } from "@/lib/monitoring/schedule";
import { getAccountEntitlements } from "@/lib/billing/account";
import { isPaidSubscription } from "@/lib/billing/is-paid";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();

  const [scores, prompts, competitors, actions, monitoring, entitlements] =
    await Promise.all([
      scoresForBrand(brand.id),
      getPrompts(brand.id),
      getCompetitors(brand.id),
      getRecommendations(brand.id),
      getBrandMonitoringSettings(brand.id),
      getAccountEntitlements(user.id),
    ]);
  const latest = scores[0];
  const previous = scores[1];
  const openActions = actions.filter((a) => a.status === "open");
  const isPaid = isPaidSubscription(entitlements);

  const scoreDelta =
    latest && previous
      ? roundForDisplay(
          Number(latest.overall_score) - Number(previous.overall_score),
        )
      : null;

  const stats = [
    {
      label: "AI Visibility Score",
      value: latest ? String(roundForDisplay(Number(latest.overall_score))) : "—",
      detail:
        scoreDelta !== null && scoreDelta !== 0
          ? `${scoreDelta > 0 ? "+" : ""}${scoreDelta} vs last scan`
          : undefined,
    },
    {
      label: "Mention rate",
      value: latest
        ? `${roundForDisplay(Number(latest.mention_rate) * 100)}%`
        : "—",
    },
    {
      label: "Share of voice",
      value: latest && isPaid
        ? `${roundForDisplay(Number(latest.share_of_voice) * 100)}%`
        : isPaid
          ? "—"
          : "Upgrade",
    },
    {
      label: "Citation score",
      value: latest && isPaid
        ? String(roundForDisplay(Number(latest.citation_score)))
        : isPaid
          ? "—"
          : "Upgrade",
    },
    {
      label: "Avg. position",
      value:
        latest?.average_position != null
          ? String(roundForDisplay(Number(latest.average_position)))
          : "—",
    },
    {
      label: "Next scheduled scan",
      value: monitoring && isPaid
        ? nextScheduledScanLabel(
            latest?.created_at,
            monitoring.monitoringFrequency,
          )
        : "—",
    },
    { label: "Tracked prompts", value: String(prompts.length) },
    { label: "Competitors", value: String(competitors.length) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {brand.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {brand.canonical_domain}
            {brand.category ? ` · ${brand.category}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={routes.publicReport(brand.slug)} target="_blank">
              Public report
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
          <RescanButton brandId={brand.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rb-panel p-5"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            {stat.detail ? (
              <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
            ) : null}
          </div>
        ))}
      </div>

      <BrandNav brandId={brand.id} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Open actions
          </h2>
          {openActions.length > 0 ? (
            <Badge variant="secondary" className="rounded-full">
              {openActions.length} open
            </Badge>
          ) : null}
        </div>
        {actions.length === 0 ? (
          <div className="mt-4 rb-empty p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No actions yet. Run a scan to generate the action centre.
            </p>
          </div>
        ) : (
          <div className="mt-4 rb-list">
            <div className="divide-y divide-border">
              {openActions.slice(0, 5).map((action) => (
                <Link
                  key={action.id}
                  href={`/dashboard/brands/${brand.id}/actions`}
                  className="block bg-card px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{action.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {action.explanation}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-full text-[11px]"
                    >
                      P{action.priority}
                    </Badge>
                  </div>
                </Link>
              ))}
              {openActions.length === 0 ? (
                <p className="bg-card px-5 py-6 text-sm text-muted-foreground">
                  All actions handled. Rescan to surface new opportunities.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
