import { NextResponse } from "next/server";
import { domainInputSchema } from "@/lib/security/url";
import { understandWebsite } from "@/lib/ai/website/understand";
import { getCachedFreeScan } from "@/lib/db/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const domain = domainInputSchema.parse(body.domain);

    const cached = await getCachedFreeScan(domain);
    if (cached) {
      return NextResponse.json({
        cached: true,
        slug: cached.brand.slug,
        brandId: cached.brand.id,
        lastScanAt: cached.scan.created_at,
        brand: {
          name: cached.brand.name,
          domain: cached.brand.canonical_domain,
          category: cached.brand.category,
          description: cached.brand.description,
        },
      });
    }

    const understanding = await understandWebsite(domain);
    return NextResponse.json({
      cached: false,
      understanding,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
