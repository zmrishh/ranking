import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccountEntitlements } from "@/lib/billing/account";
import { isPaidSubscription } from "@/lib/billing/is-paid";
import { PLAN_CONFIG } from "@/lib/billing/entitlements";
import { getBrandById, getCompetitors } from "@/lib/db/repository";
import { BrandPageHeader } from "@/components/dashboard/brand-page-header";
import { CompetitorsManager } from "@/components/dashboard/competitors-manager";

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();
  const [competitors, entitlements] = await Promise.all([
    getCompetitors(brand.id),
    getAccountEntitlements(user.id),
  ]);
  const plan = PLAN_CONFIG[entitlements.plan];

  return (
    <div className="space-y-6">
      <BrandPageHeader
        brandId={brand.id}
        brandName={brand.name}
        title="Competitors"
        description="Brands that AI engines recommend alongside — or instead of — you."
      />
      <CompetitorsManager
        brandId={brand.id}
        initialCompetitors={competitors}
        competitorLimit={plan.features.competitorsPerBrand}
        isPaid={isPaidSubscription(entitlements)}
      />
    </div>
  );
}
