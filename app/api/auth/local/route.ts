import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import {
  usingLocalDb,
  claimBrand,
  getBrandBySlug,
  listBrandsForOwner,
  getSubscription,
  getUserOnboarding,
} from "@/lib/db/repository";
import { createClient } from "@/lib/db/supabase/server";
import { isPaidSubscription } from "@/lib/billing/is-paid";
import { isOnboardingComplete } from "@/lib/onboarding/state";
import { routes, safeReturnTo } from "@/lib/routes";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mode: z.enum(["signin", "signup"]),
  claim: z.string().optional().nullable(),
  returnTo: z.string().optional().nullable(),
});

async function resolveRedirect(input: {
  userId: string;
  claim: string | null | undefined;
  returnTo: string | null | undefined;
}): Promise<string> {
  if (input.claim) {
    return `${routes.brands}?claimed=${encodeURIComponent(input.claim)}`;
  }
  const returnTo = safeReturnTo(input.returnTo);
  if (returnTo) return returnTo;

  const sub = await getSubscription(input.userId);
  if (sub) {
    const onboarding = await getUserOnboarding(input.userId);
    if (
      isPaidSubscription({ plan: sub.plan, status: sub.status }) &&
      !isOnboardingComplete(onboarding)
    ) {
      return routes.onboarding;
    }
  }

  const brands = await listBrandsForOwner(input.userId);
  // New accounts with nothing to show yet go straight into the signed-in
  // scan flow — never the public homepage hero.
  if (brands.length === 0) return routes.newScan();
  return routes.dashboard;
}

export async function POST(request: Request) {
  const body = schema.parse(await request.json());

  if (!usingLocalDb()) {
    const supabase = await createClient();
    if (body.mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (body.claim && data.user) {
        const brand = await getBrandBySlug(body.claim);
        if (brand) await claimBrand(brand.id, data.user.id);
      }
      return NextResponse.json({
        redirect: data.user
          ? await resolveRedirect({
              userId: data.user.id,
              claim: body.claim,
              returnTo: body.returnTo,
            })
          : routes.dashboard,
      });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({
      redirect: data.user
        ? await resolveRedirect({
            userId: data.user.id,
            claim: body.claim,
            returnTo: body.returnTo,
          })
        : routes.dashboard,
    });
  }

  // Local demo auth for environments without Supabase.
  const id = createHash("sha256").update(body.email.toLowerCase()).digest("hex").slice(0, 32);
  const user = {
    id: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`,
    email: body.email.toLowerCase(),
  };

  // Ensure UUID-looking id
  if (user.id.length !== 36) {
    user.id = randomUUID();
  }

  if (body.claim) {
    const brand = await getBrandBySlug(body.claim);
    if (brand) await claimBrand(brand.id, user.id);
  }

  const response = NextResponse.json({
    redirect: await resolveRedirect({
      userId: user.id,
      claim: body.claim,
      returnTo: body.returnTo,
    }),
  });
  response.cookies.set("rbai_local_user", encodeURIComponent(JSON.stringify(user)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
