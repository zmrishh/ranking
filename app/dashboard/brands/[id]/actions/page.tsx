import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getBrandById, getRecommendations } from "@/lib/db/repository";
import { Badge } from "@/components/ui/badge";
import { ActionStatusButtons } from "@/components/dashboard/action-status-buttons";
import { BrandPageHeader } from "@/components/dashboard/brand-page-header";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();
  const actions = await getRecommendations(brand.id);

  return (
    <div className="space-y-6">
      <BrandPageHeader
        brandId={brand.id}
        brandName={brand.name}
        title="Action centre"
        description="Evidence-based recommendations tied to specific prompts and citations — never a ranking guarantee."
      />
      {actions.length === 0 ? (
        <div className="rb-empty p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No actions yet. Run a scan to generate recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rb-panel p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px]"
                    >
                      Priority {action.priority}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[11px] capitalize"
                    >
                      {action.estimated_impact} impact
                    </Badge>
                    {action.status !== "open" ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[11px] capitalize"
                      >
                        {action.status.replaceAll("_", " ")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2.5 font-medium">{action.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {action.explanation}
                  </p>
                </div>
                <ActionStatusButtons
                  actionId={action.id}
                  status={action.status}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
