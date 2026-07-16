import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAccountEntitlements } from "@/lib/billing/account";
import { isPaidSubscription } from "@/lib/billing/is-paid";
import { PLAN_CONFIG } from "@/lib/billing/entitlements";
import { getBrandById, listAllPrompts } from "@/lib/db/repository";
import { BrandPageHeader } from "@/components/dashboard/brand-page-header";
import { PromptsManager } from "@/components/dashboard/prompts-manager";

export default async function PromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand || brand.owner_id !== user.id) notFound();

  const [entitlements, prompts] = await Promise.all([
    getAccountEntitlements(user.id),
    listAllPrompts(brand.id),
  ]);
  const plan = PLAN_CONFIG[entitlements.plan];
  const isPaid = isPaidSubscription(entitlements);

  return (
    <div className="space-y-6">
      <BrandPageHeader
        brandId={brand.id}
        brandName={brand.name}
        title="Tracked prompts"
        description="Buyer-intent questions sampled on every scan. Generated without your brand name to avoid priming."
      />
      <PromptsManager
        brandId={brand.id}
        initialPrompts={prompts}
        activePromptLimit={plan.features.activePrompts}
        isPaid={isPaid}
        defaultCountry={brand.default_country}
        defaultLanguage={brand.default_language}
      />
    </div>
  );
}
