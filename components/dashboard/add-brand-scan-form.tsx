"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils";

type Understanding = {
  name: string;
  category: string;
  description: string;
  confidence: { category: number };
};

/**
 * In-dashboard form for signed-in users with no brand yet (or adding another
 * brand on a paid plan). Never redirects to the public homepage scan.
 */
export function AddBrandScanForm({
  isPaid,
  brandLimitReached,
}: {
  isPaid: boolean;
  brandLimitReached: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understanding, setUnderstanding] = useState<Understanding | null>(
    null,
  );
  const [category, setCategory] = useState("");
  const [recentBlock, setRecentBlock] = useState<{
    reportSlug: string;
    brandId?: string;
    lastScanAt: string | null;
  } | null>(null);

  async function preview() {
    setLoading(true);
    setError(null);
    setRecentBlock(null);
    try {
      const res = await fetch("/api/scans/free/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");

      if (data.cached) {
        // Domain already has a recent free report — claim/view inside dashboard.
        setRecentBlock({
          reportSlug: data.slug,
          brandId: data.brandId,
          lastScanAt: data.lastScanAt ?? null,
        });
        return;
      }

      setUnderstanding(data.understanding);
      setCategory(data.understanding.category);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not analyse website";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function startScan() {
    setLoading(true);
    setError(null);
    setRecentBlock(null);
    try {
      const res = await fetch("/api/scans/dashboard/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          understanding,
          categoryOverride: category,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "recently_scanned") {
        setRecentBlock({
          reportSlug: data.reportSlug,
          brandId: data.brandId,
          lastScanAt: data.lastScanAt ?? null,
        });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not start scan");

      router.push(routes.scanProgress(data.scanRunId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start scan";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (brandLimitReached) {
    return (
      <div className="rb-panel p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Brand limit reached
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your current plan does not allow another brand. Upgrade to add more
          brands and run premium scans from the dashboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link
              href={routes.billing({
                plan: "founder",
                returnTo: routes.newScan(),
              })}
            >
              Upgrade
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.brands}>View brands</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-panel p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Add a brand to scan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPaid
            ? "Enter a website to add it to your account and start a premium scan."
            : "Enter a website to claim it and run your free scan — no trip back to the homepage."}
        </p>
      </div>

      {!understanding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (domain.trim() && !loading) void preview();
          }}
        >
          <label htmlFor="dash-domain" className="text-sm font-medium">
            Company website
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Globe
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="dash-domain"
                placeholder="yourcompany.com"
                className="h-11 pl-9"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-11"
              disabled={loading || !domain.trim()}
            >
              {loading ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight data-icon="inline-end" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) void startScan();
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[color:var(--rb-blue)]" />
            <p className="text-sm font-medium">{understanding.name}</p>
            <Badge variant="secondary" className="text-[11px]">
              {Math.round(understanding.confidence.category * 100)}% confidence
            </Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {understanding.description}
          </p>
          <label htmlFor="dash-category" className="mt-4 block text-sm font-medium">
            Confirm category
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="dash-category"
              className="h-11 flex-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              size="lg"
              className="h-11"
              disabled={loading || !category.trim()}
            >
              {loading ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Start scan
                  <ArrowRight data-icon="inline-end" />
                </>
              )}
            </Button>
          </div>
          <button
            type="button"
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4"
            onClick={() => {
              setUnderstanding(null);
              setCategory("");
            }}
          >
            Use a different domain
          </button>
        </form>
      )}

      {recentBlock ? (
        <Alert className="mt-4">
          <AlertTitle>This website was scanned recently</AlertTitle>
          <AlertDescription>
            <p>
              You can view the existing report or upgrade for ongoing
              monitoring.
              {recentBlock.lastScanAt
                ? ` Last scanned ${formatDate(recentBlock.lastScanAt)}.`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={routes.publicReport(recentBlock.reportSlug)}>
                  View report
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/claim/${encodeURIComponent(recentBlock.reportSlug)}`}>
                  Claim &amp; open in dashboard
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={routes.billing({
                    plan: "founder",
                    returnTo: routes.newScan(),
                  })}
                >
                  Upgrade
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRecentBlock(null)}
              >
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Could not continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
