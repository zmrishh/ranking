import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { usingLocalDb } from "@/lib/db/repository";
import { createServiceClient } from "@/lib/db/supabase/service";
import { promises as fs } from "fs";
import path from "path";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (usingLocalDb()) {
    const storePath = path.join(process.cwd(), ".data", "local-store.json");
    try {
      const store = JSON.parse(await fs.readFile(storePath, "utf8"));
      store.brands = (store.brands || []).filter(
        (b: { owner_id: string | null }) => b.owner_id !== user.id,
      );
      store.subscriptions = (store.subscriptions || []).filter(
        (s: { user_id: string }) => s.user_id !== user.id,
      );
      store.alerts = (store.alerts || []).filter(
        (a: { user_id: string }) => a.user_id !== user.id,
      );
      await fs.writeFile(storePath, JSON.stringify(store, null, 2));
    } catch {
      // ignore missing store
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set("rbai_local_user", "", { path: "/", maxAge: 0 });
    return response;
  }

  const supabase = createServiceClient();
  await supabase.from("brands").delete().eq("owner_id", user.id);
  await supabase.from("subscriptions").delete().eq("user_id", user.id);
  await supabase.from("alerts").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);
  return NextResponse.json({ ok: true });
}
