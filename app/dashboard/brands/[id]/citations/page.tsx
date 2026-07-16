import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import {
  getBrandById,
  getLatestCompletedScanForBrand,
  getQueryResults,
} from "@/lib/db/repository";
import { Badge } from "@/components/ui/badge";
import { BrandPageHeader } from "@/components/dashboard/brand-page-header";

export default async function CitationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();

  const latestScan = await getLatestCompletedScanForBrand(brand.id);
  const results = latestScan ? await getQueryResults(latestScan.id) : [];
  const citations = results.flatMap((r) =>
    (
      (r.citations as Array<{
        url: string;
        title?: string | null;
        domain?: string | null;
        citedForBrand?: boolean;
      }>) || []
    ).map((c) => ({ ...c, provider: r.provider })),
  );

  return (
    <div className="space-y-6">
      <BrandPageHeader
        brandId={brand.id}
        brandName={brand.name}
        title="Citations"
        description="Sources AI engines cited when answering buyer questions in your category."
      />
      {citations.length === 0 ? (
        <div className="rb-empty p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No citations yet. Run a scan to see which sources shape AI answers.
          </p>
        </div>
      ) : (
        <div className="rb-list">
          <div className="divide-y divide-border">
            {citations.map((c, idx) => (
              <div
                key={`${c.url}-${idx}`}
                className="flex items-center justify-between gap-4 bg-card px-5 py-3.5"
              >
                <div className="min-w-0">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-[color:var(--rb-blue)] hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{c.title || c.url}</span>
                  </a>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {c.domain} · {c.provider}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 rounded-full text-[11px] ${
                    c.citedForBrand ? "text-[color:var(--rb-green)]" : ""
                  }`}
                >
                  {c.citedForBrand ? "Supports brand" : "Other source"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
