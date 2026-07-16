"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Understanding = {
  name: string;
  category: string;
  description: string;
  targetAudience: string;
  confidence: { category: number };
};

export function DomainScanForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understanding, setUnderstanding] = useState<Understanding | null>(
    null,
  );
  const [category, setCategory] = useState("");

  async function preview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scans/free/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      if (data.cached) {
        router.push(`/report/${data.slug}`);
        return;
      }
      setUnderstanding(data.understanding);
      setCategory(data.understanding.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function startScan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scans/free/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          understanding,
          categoryOverride: category,
          turnstileToken: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start scan");
      if (data.cached) {
        router.push(`/report/${data.slug}`);
        return;
      }
      router.push(`/scan/${data.scanRunId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start scan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="scan"
      className="w-full rounded-2xl border border-white/70 bg-white/80 p-1.5 shadow-[0_1px_2px_rgba(12,15,20,0.04),0_24px_64px_rgba(12,15,20,0.1)] backdrop-blur-xl"
    >
      <div className="rounded-[14px] bg-white p-4 sm:p-5">
        {!understanding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (domain.trim() && !loading) void preview();
            }}
          >
            <label
              htmlFor="domain"
              className="text-sm font-medium text-foreground"
            >
              Company website
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="domain"
                  placeholder="yourcompany.com"
                  className="h-12 rounded-xl border-border/80 bg-[color:var(--rb-mist)] pl-10 text-base shadow-none focus-visible:bg-white"
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
                className="h-12 rounded-xl px-6"
                disabled={loading || !domain.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    Check visibility
                    <ArrowRight data-icon="inline-end" />
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free · no account · one public scan per domain every 30 days
            </p>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) void startScan();
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="size-4 text-[color:var(--rb-blue)]" />
                  <p className="text-sm font-medium">{understanding.name}</p>
                  <Badge variant="secondary" className="rounded-full text-[11px]">
                    {Math.round(understanding.confidence.category * 100)}%
                    confidence
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {understanding.description}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="category" className="text-sm font-medium">
                Confirm your category
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Buyer questions are generated from this — correct it if needed.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="category"
                  className="h-12 flex-1 rounded-xl"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 rounded-xl px-6"
                  disabled={loading || !category.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                      Starting…
                    </>
                  ) : (
                    <>
                      Start free scan
                      <ArrowRight data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Scan blocked</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
