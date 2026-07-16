"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Lock, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { routes } from "@/lib/routes";
import {
  providerDisplayName,
  SUPPORTED_COUNTRIES,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

export type ScanBrandOption = {
  id: string;
  name: string;
  domain: string;
  category: string | null;
  slug: string;
  prompts: Array<{
    id: string;
    prompt: string;
    type: string;
    country: string;
    language: string;
  }>;
  lastScanAt: string | null;
  recentlyScanned: boolean;
  lastCompletedScanAt: string | null;
};

type PlanInfo = {
  id: string;
  name: string;
  isPaid: boolean;
  allowedProviders: Array<"openai" | "gemini" | "perplexity">;
  countries: number;
  languages: number;
  checksLimit: number;
  checksUsed: number;
};

const ALL_PROVIDERS = ["openai", "gemini", "perplexity"] as const;

export function NewScanForm({
  brands,
  preselectedBrandId,
  plan,
}: {
  brands: ScanBrandOption[];
  preselectedBrandId: string | null;
  plan: PlanInfo;
}) {
  const router = useRouter();
  const initialBrand =
    brands.find((b) => b.id === preselectedBrandId) ?? brands[0]!;
  const [brandId, setBrandId] = useState(initialBrand.id);
  const [providers, setProviders] = useState<string[]>(
    plan.isPaid ? [...plan.allowedProviders] : ["openai"],
  );
  const [country, setCountry] = useState<string>("us");
  const [language, setLanguage] = useState<string>("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentBlock, setRecentBlock] = useState<{
    reportSlug: string;
    lastScanAt: string | null;
  } | null>(null);

  const brand = brands.find((b) => b.id === brandId) ?? initialBrand;
  const estimatedChecks = brand.prompts.length * providers.length;
  const remaining = Math.max(plan.checksLimit - plan.checksUsed, 0);
  const overAllowance = estimatedChecks > remaining;

  const countryOptions = useMemo(
    () => SUPPORTED_COUNTRIES.slice(0, Math.max(plan.countries, 1)),
    [plan.countries],
  );
  const languageOptions = useMemo(
    () => SUPPORTED_LANGUAGES.slice(0, Math.max(plan.languages, 1)),
    [plan.languages],
  );

  function toggleProvider(id: string) {
    if (!plan.isPaid) return;
    setProviders((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  }

  async function startScan() {
    setLoading(true);
    setError(null);
    setRecentBlock(null);
    try {
      const res = await fetch("/api/scans/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          providers,
          country: plan.isPaid ? country : undefined,
          language: plan.isPaid ? language : undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === "recently_scanned") {
        setRecentBlock({
          reportSlug: data.reportSlug,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Brand selection */}
        <section className="rb-panel">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">1. Select brand</h2>
          </div>
          <div className="divide-y divide-border">
            {brands.map((option) => {
              const selected = option.id === brandId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBrandId(option.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors",
                    selected ? "bg-muted/60" : "hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {option.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {option.domain}
                      {option.category ? ` · ${option.category}` : ""}
                    </p>
                    {option.lastScanAt ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        Last scan{" "}
                        {formatDate(option.lastScanAt)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border",
                    )}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Questions */}
        <section className="rb-panel">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">
              2. Questions to be scanned
            </h2>
            <Badge variant="secondary" className="rounded-full text-[11px]">
              {brand.prompts.length} questions
            </Badge>
          </div>
          {brand.prompts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No tracked questions yet for this brand.
            </p>
          ) : (
            <div className="max-h-72 divide-y divide-border overflow-y-auto">
              {brand.prompts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-5 py-2.5"
                >
                  <p className="truncate text-sm">{p.prompt}</p>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground capitalize">
                    {p.type.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Providers + locale */}
        <section className="rb-panel">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">3. Scan settings</h2>
          </div>
          <div className="space-y-5 px-5 py-4">
            <div>
              <p className="text-sm font-medium">AI providers</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALL_PROVIDERS.map((id) => {
                  const allowed =
                    plan.isPaid && plan.allowedProviders.includes(id);
                  const lockedForFree = !plan.isPaid && id !== "openai";
                  const active = providers.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={lockedForFree || (!allowed && plan.isPaid)}
                      onClick={() => toggleProvider(id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground",
                        (lockedForFree || (!allowed && plan.isPaid)) &&
                          "cursor-not-allowed opacity-60 hover:text-muted-foreground",
                      )}
                    >
                      {lockedForFree ? <Lock className="size-3" /> : null}
                      {providerDisplayName(id)}
                    </button>
                  );
                })}
              </div>
              {!plan.isPaid ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Free scans use OpenAI only.{" "}
                  <Link
                    href={routes.billing({ plan: "founder" })}
                    className="text-foreground underline underline-offset-4"
                  >
                    Upgrade
                  </Link>{" "}
                  for Gemini and Perplexity.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="scan-country" className="text-sm font-medium">
                  Country
                </label>
                <select
                  id="scan-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!plan.isPaid || countryOptions.length <= 1}
                  className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="scan-language" className="text-sm font-medium">
                  Language
                </label>
                <select
                  id="scan-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={!plan.isPaid || languageOptions.length <= 1}
                  className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {languageOptions.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {plan.isPaid && plan.countries <= 1 ? (
              <p className="text-xs text-muted-foreground">
                Multiple countries and languages are available on Growth and
                Agency plans.
              </p>
            ) : null}
          </div>
        </section>

        {recentBlock ? (
          <Alert>
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
                  <Link
                    href={routes.billing({
                      plan: "founder",
                      returnTo: routes.newScan(brandId),
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
          <Alert variant="destructive">
            <AlertTitle>Scan could not start</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* Summary sidebar */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-20">
        <div className="rb-panel p-5">
          <h2 className="text-sm font-semibold">Scan summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Brand</dt>
              <dd className="truncate font-medium">{brand.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Questions</dt>
              <dd className="font-medium">{brand.prompts.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Providers</dt>
              <dd className="text-right font-medium">
                {providers.map(providerDisplayName).join(", ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2.5">
              <dt className="text-muted-foreground">Estimated AI checks</dt>
              <dd className="font-semibold">{estimatedChecks}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Remaining this month</dt>
              <dd
                className={cn(
                  "font-medium",
                  overAllowance && "text-destructive",
                )}
              >
                {remaining} / {plan.checksLimit}
              </dd>
            </div>
          </dl>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                overAllowance ? "bg-destructive" : "bg-foreground",
              )}
              style={{
                width: `${Math.min((plan.checksUsed / Math.max(plan.checksLimit, 1)) * 100, 100)}%`,
              }}
            />
          </div>
          <Button
            className="mt-5 w-full"
            disabled={
              loading || brand.prompts.length === 0 || overAllowance
            }
            onClick={startScan}
          >
            {loading ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play data-icon="inline-start" />
                Start scan
              </>
            )}
          </Button>
          {overAllowance ? (
            <p className="mt-2 text-xs text-destructive">
              This scan exceeds your remaining monthly allowance.{" "}
              <Link
                href={routes.billing({ returnTo: routes.newScan(brandId) })}
                className="underline underline-offset-4"
              >
                Upgrade to continue
              </Link>
              .
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Plan: {plan.name}. One provider answering one question equals one
            AI check.
          </p>
        </div>
        {!plan.isPaid && brand.recentlyScanned ? (
          <div className="rb-warn rounded-2xl p-4 text-sm">
            <p className="font-medium">30-day scan limit</p>
            <p className="mt-1 text-muted-foreground">
              Free scans run once per domain every 30 days. This brand was last
              scanned{" "}
              {brand.lastCompletedScanAt
                ? formatDate(brand.lastCompletedScanAt)
                : "recently"}
              .
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={routes.publicReport(brand.slug)}>View report</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={routes.billing({ plan: "founder" })}>Upgrade</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
