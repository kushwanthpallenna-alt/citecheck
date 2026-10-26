"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getJobStatus, JobResult, getVerdictBadgeInfo } from "@/lib/api";

function AnalyzingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const filename = searchParams.get("filename")
    ? decodeURIComponent(searchParams.get("filename") as string)
    : "Document";

  const [hasInitialResponse, setHasInitialResponse] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [jobError, setJobError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [checkedCount, setCheckedCount] = useState<number>(0);
  const [results, setResults] = useState<JobResult[]>([]);

  useEffect(() => {
    if (!jobId || isPaused) return;

    let isMounted = true;

    const poll = async () => {
      try {
        const data = await getJobStatus(jobId);
        if (!isMounted) return;

        setHasInitialResponse(true);
        setBackendError(null);
        setJobStatus(data.status);
        setJobError(data.error);

        setTotalCount(data.total || 0);
        setCheckedCount(data.done || 0);

        if (data.results) {
          setResults(data.results);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("currentJobResults", JSON.stringify(data.results));
            sessionStorage.setItem("currentJobId", jobId);
            sessionStorage.setItem("currentJobFilename", filename);
            sessionStorage.setItem("currentJobStatus", data.status);
            if (data.error) sessionStorage.setItem("currentJobError", data.error);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Polling error:", err);
        setBackendError(err.message || "Failed to connect to backend server.");
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, isPaused, filename]);

  // Compute progress strictly from done and total
  const progress = totalCount > 0
    ? Math.min(100, Math.round((checkedCount / totalCount) * 100))
    : (jobStatus === "done" ? 100 : 0);

  // Status text based strictly on real backend status
  const getStatusMessage = () => {
    if (jobStatus === "queued") return "Document queued in worker thread...";
    if (jobStatus === "extracting") return "Extracting claims and citation markers with Gemini...";
    if (jobStatus === "verifying") return `Verifying sources (${checkedCount}/${totalCount || "?"})`;
    if (jobStatus === "done") return "Verification Audit Complete! All citations cross-referenced.";
    if (jobStatus === "rate_limited") return jobError || "Gemini API rate limit reached (429).";
    if (jobStatus === "error") return jobError || "Pipeline error encountered.";
    return "Processing...";
  };

  // Map claims only from results array
  const streamItems = results.map((r, idx) => {
    const badge = getVerdictBadgeInfo(r.verdict);
    return {
      claimId: `claim-${idx + 1}`,
      claimNum: String(idx + 1).padStart(2, "0"),
      text: r.claim_text,
      citation: `${r.resolved_title || r.reference_string}${r.doi ? ` • DOI: ${r.doi}` : ""}`,
      status: badge.label,
      tag: `${r.source_depth} • Conf: ${(r.confidence * 100).toFixed(0)}%`,
      detail: r.reason,
      raw: r,
    };
  });

  // Breakdown statistics
  const supportedCount = streamItems.filter(
    (i) => i.raw.verdict === "supported"
  ).length;
  const weakCount = streamItems.filter(
    (i) => i.raw.verdict === "weakly_supported"
  ).length;
  const mismatchCount = streamItems.filter(
    (i) => i.raw.verdict === "mismatched"
  ).length;
  const unverifiableCount = streamItems.filter(
    (i) => i.raw.verdict === "unverifiable"
  ).length;

  // Plain loading skeleton before the first GET /jobs/{id} response arrives
  if (!hasInitialResponse && !backendError) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-24">
        <Header pageTitle="Verification Progress" showBack backHref="/" />
        <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container mb-6 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="h-4 w-32 bg-surface-container rounded mb-2"></div>
                <h2 className="font-headline-sm text-base sm:text-lg text-primary font-semibold">
                  {filename}
                </h2>
              </div>
              {jobId && (
                <span className="text-secondary font-label-sm text-xs">
                  Job ID: {jobId.slice(0, 8)}…
                </span>
              )}
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 w-44 bg-surface-container rounded"></div>
              <div className="w-full h-2.5 rounded-full bg-surface-container"></div>
              <div className="h-3 w-64 bg-surface-container rounded"></div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-surface-container">
              <div className="h-6 w-24 bg-surface-container rounded-lg"></div>
              <div className="h-6 w-24 bg-surface-container rounded-lg"></div>
              <div className="h-6 w-24 bg-surface-container rounded-lg"></div>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container animate-pulse">
            <div className="h-4 w-40 bg-surface-container rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-surface-container-low/70 border border-surface-container space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-28 bg-surface-container rounded"></div>
                    <div className="h-3 w-20 bg-surface-container rounded"></div>
                  </div>
                  <div className="h-3.5 w-full bg-surface-container rounded"></div>
                  <div className="h-3 w-3/4 bg-surface-container rounded"></div>
                </div>
              ))}
            </div>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Header pageTitle="Verification Progress" showBack backHref="/" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
        {/* Unreachable / Connection Error Banner */}
        {backendError && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-rose-700">cloud_off</span>
              <div>
                <h4 className="font-headline-sm text-sm font-bold">Backend Connection Error</h4>
                <p className="font-ui-body text-xs text-rose-950">{backendError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-lg bg-rose-200 text-rose-950 font-label-sm text-xs font-semibold hover:bg-rose-300 transition-colors"
            >
              Back to Upload
            </button>
          </div>
        )}

        {/* Quota / Rate Limited Banner: only appears when backend status is rate_limited and shows backend's error text */}
        {jobStatus === "rate_limited" && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-amber-700">hourglass_top</span>
              <div>
                <h4 className="font-headline-sm text-sm font-bold">Rate Limit Reached (429)</h4>
                <p className="font-ui-body text-xs text-amber-950">
                  {jobError || "Gemini API rate limit reached. All verified claims have been preserved."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(jobId ? `/results?jobId=${jobId}&filename=${encodeURIComponent(filename)}` : "/results")}
                className="px-3 py-1.5 rounded-lg bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
              >
                Review Partial Results
              </button>
            </div>
          </div>
        )}

        {/* Pipeline Error Banner: only appears when backend status is error and shows backend's error text */}
        {jobStatus === "error" && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-rose-700">error_outline</span>
              <div>
                <h4 className="font-headline-sm text-sm font-bold">Extraction Error Encountered</h4>
                <p className="font-ui-body text-xs text-rose-950">
                  {jobError || "The document pipeline encountered an error."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Active Card */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  {jobStatus === "done" ? "Verification Completed" : "Live Verification Active"}
                </span>
                {jobId && (
                  <span className="text-secondary font-label-sm text-xs">
                    Job ID: {jobId.slice(0, 8)}…
                  </span>
                )}
              </div>
              <h2 className="font-headline-sm text-base sm:text-lg text-primary font-semibold truncate">
                {filename}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant font-label-sm text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                {isPaused ? "Resume" : "Pause Stream"}
              </button>
              <button
                type="button"
                onClick={() => router.push(jobId ? `/results?jobId=${jobId}&filename=${encodeURIComponent(filename)}` : "/results")}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>View Results</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Progress Bar & Counters */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between font-label-sm text-xs text-secondary">
              <span className="font-semibold text-on-surface">
                {checkedCount} of {totalCount} claims checked
              </span>
              <span>
                {jobStatus === "done" ? "Audit complete" : `${progress}%`}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-primary-container transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-secondary font-ui-body">
              <span>{progress}% • {getStatusMessage()}</span>
              <span className="font-medium text-primary uppercase">
                {jobStatus}
              </span>
            </div>
          </div>

          {/* Live Breakdown Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-container">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> {supportedCount} Supported
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">warning</span> {weakCount} Weak Evidence
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">cancel</span> {mismatchCount} Mismatch
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">help</span> {unverifiableCount} Unverifiable
            </span>
            {totalCount > checkedCount && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-secondary text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">schedule</span> {totalCount - checkedCount} In Queue
              </span>
            )}
          </div>
        </section>

        {/* Live Feed Stream Section */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">feed</span>
              <h3 className="font-headline-sm text-sm font-semibold text-primary">
                Audit Stream Live Feed ({streamItems.length} Claims Received)
              </h3>
            </div>
            {jobStatus !== "done" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Processing
              </span>
            )}
          </div>

          <div className="space-y-3.5">
            {streamItems.length === 0 && (
              <div className="p-8 text-center text-secondary text-sm">
                No claims verified yet. Waiting for backend results...
              </div>
            )}

            {streamItems.map((item, index) => (
              <div
                key={item.claimId || index}
                className="p-4 rounded-xl bg-surface-container-low/70 border border-surface-container hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-xs font-semibold text-secondary">
                      Claim {item.claimNum || index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                        item.status === "SUPPORTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "WEAK CORROBORATION" || item.status === "WEAK EVIDENCE"
                          ? "bg-amber-100 text-amber-900"
                          : item.status === "CITATION MISMATCH" || item.status === "MISMATCH"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {item.status === "SUPPORTED"
                          ? "check_circle"
                          : item.status === "WEAK CORROBORATION" || item.status === "WEAK EVIDENCE"
                          ? "warning"
                          : item.status === "CITATION MISMATCH" || item.status === "MISMATCH"
                          ? "cancel"
                          : "help"}
                      </span>
                      {item.status}
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-secondary">
                    {item.tag}
                  </span>
                </div>

                <p className="font-body-md text-xs sm:text-sm text-on-surface mb-2 leading-relaxed">
                  “{item.text}”
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-surface-container/60 text-[11px] text-secondary font-ui-body">
                  <span className="truncate flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">menu_book</span>
                    {item.citation}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.raw && typeof window !== "undefined") {
                        sessionStorage.setItem("selectedClaimDetail", JSON.stringify(item.raw));
                      }
                      router.push(`/inspector?claimIndex=${index}`);
                    }}
                    className="text-primary font-semibold hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>Inspect</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Currently Processing Indicator */}
            {progress < 100 && jobStatus !== "rate_limited" && jobStatus !== "error" && (
              <div className="p-3.5 rounded-xl border border-dashed border-primary-container/40 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  <div>
                    <p className="font-label-sm text-xs font-semibold text-primary">
                      {getStatusMessage()}
                    </p>
                    <p className="font-ui-body text-[11px] text-secondary">
                      Ranking snippets with BM25 & validating empirical polarity with Gemini
                    </p>
                  </div>
                </div>
                <span className="text-xs text-secondary font-label-sm">Active</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

export default function AnalyzingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <AnalyzingContent />
    </Suspense>
  );
}
