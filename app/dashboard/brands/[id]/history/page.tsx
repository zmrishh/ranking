import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getBrandById, scoresForBrand } from "@/lib/db/repository";
import { ScoreHistoryChart } from "@/components/dashboard/score-history-chart";
import { roundForDisplay } from "@/lib/ai/scoring/score";
import { BrandPageHeader } from "@/components/dashboard/brand-page-header";
import { BrandExportLinks } from "@/components/dashboard/brand-export-links";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();
  const scores = await scoresForBrand(brand.id);
  const chartData = scores
    .slice()
    .reverse()
    .map((s) => ({
      date: new Date(s.created_at).toLocaleDateString(),
      score: roundForDisplay(Number(s.overall_score)),
    }));

  return (
    <div className="space-y-6">
      <BrandPageHeader
        brandId={brand.id}
        brandName={brand.name}
        title="Score history"
        description="How your AI Visibility Score has moved across scans."
      />
      {scores.length === 0 ? (
        <div className="rb-empty p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No scored scans yet. Run a scan to start your history.
          </p>
        </div>
      ) : (
        <>
          <BrandExportLinks brandId={brand.id} />
          <div className="rb-panel p-5">
            <ScoreHistoryChart data={chartData} />
          </div>
          <div className="rb-list">
            <div className="divide-y divide-border">
              {scores.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-card px-5 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      mention {roundForDisplay(Number(s.mention_rate) * 100)}%
                    </span>
                    <span className="font-semibold">
                      {roundForDisplay(Number(s.overall_score))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
