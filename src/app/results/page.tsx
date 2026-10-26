"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { JobResult, getJobStatus, getVerdictBadgeInfo } from "@/lib/api";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const filename = searchParams.get("filename")
    ? decodeURIComponent(searchParams.get("filename") as string)
    : (typeof window !== "undefined" && sessionStorage.getItem("currentJobFilename")) || "Document";

  const [viewMode, setViewMode] = useState<"doc" | "list">("doc");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [realResults, setRealResults] = useState<JobResult[]>([]);

  // Load real results from backend or sessionStorage
  useEffect(() => {
    if (jobId) {
      getJobStatus(jobId)
        .then((data) => {
          setJobStatus(data.status);
          setJobError(data.error);
          setRealResults(data.results || []);
          setIsLoading(false);
        })
        .catch((err) => {
          // Fallback to sessionStorage if saved for this specific job
          if (typeof window !== "undefined") {
            const savedId = sessionStorage.getItem("currentJobId");
            const saved = sessionStorage.getItem("currentJobResults");
            if (savedId === jobId && saved) {
              try {
                setRealResults(JSON.parse(saved));
                setJobStatus(sessionStorage.getItem("currentJobStatus") || "done");
                setJobError(sessionStorage.getItem("currentJobError") || null);
                setIsLoading(false);
                return;
              } catch {}
            }
          }
          setBackendError(err.message || "Failed to load job status from backend.");
          setIsLoading(false);
        });
    } else if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("currentJobResults");
      if (saved) {
        try {
          setRealResults(JSON.parse(saved));
          setJobStatus(sessionStorage.getItem("currentJobStatus") || "done");
          setJobError(sessionStorage.getItem("currentJobError") || null);
        } catch {}
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [jobId]);

  const handleRecheck = () => {
    if (jobId) {
      setIsRechecking(true);
      getJobStatus(jobId)
        .then((data) => {
          setJobStatus(data.status);
          setJobError(data.error);
          setRealResults(data.results || []);
        })
        .catch((err) => {
          setBackendError(err.message || "Failed to re-check backend status.");
        })
        .finally(() => {
          setIsRechecking(false);
        });
    }
  };

  // Build claims list: strictly from real results only
  const claimsList = realResults.map((r, idx) => {
    const badge = getVerdictBadgeInfo(r.verdict);
    return {
      id: `claim-${idx + 1}`,
      claimNumber: idx + 1,
      totalClaims: realResults.length,
      line: idx + 1,
      section: r.claim_position_in_document || `Citation ${r.citation_marker || idx + 1}`,
      page: r.source_depth,
      draftText: r.claim_text,
      verdict: badge.label,
      badgeClass: badge.badgeClass,
      icon: badge.icon,
      confidence: Math.round(r.confidence * 100),
      confidenceDescription: `${r.source_depth} • ${r.reason}`,
      citationTitle: r.resolved_title || r.reference_string,
      citationAuthors: r.authors || "Authors not resolved",
      citationJournal: r.year ? `Published ${r.year}` : "",
      citationDoi: r.doi || "",
      provenanceStatus: r.source_depth === "full text" ? "open_access" : r.source_depth === "abstract only" ? "abstract_only" : "paywalled",
      sourcePage: r.source_depth,
      sourceText: r.evidence_quote || r.reason || "Evaluated against retrieved canonical source text.",
      raw: r,
    };
  });

  // Compute stats
  const supportedCount = claimsList.filter(
    (c) => c.raw.verdict === "supported"
  ).length;
  const weakCount = claimsList.filter(
    (c) => c.raw.verdict === "weakly_supported"
  ).length;
  const mismatchCount = claimsList.filter(
    (c) => c.raw.verdict === "mismatched"
  ).length;
  const unverifiableCount = claimsList.filter(
    (c) => c.raw.verdict === "unverifiable"
  ).length;

  const totalCount = claimsList.length;
  const integrityScore = totalCount > 0 ? Math.round((supportedCount / totalCount) * 100) : 0;

  const filteredClaims = claimsList.filter((claim) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "SUPPORTED") return claim.raw.verdict === "supported";
    if (selectedFilter === "WEAK") return claim.raw.verdict === "weakly_supported";
    if (selectedFilter === "MISMATCH") return claim.raw.verdict === "mismatched";
    if (selectedFilter === "UNVERIFIABLE") return claim.raw.verdict === "unverifiable";
    return true;
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-24">
        <Header pageTitle="Verification Results" showBack backHref="/" />
        <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
          <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container mb-6 animate-pulse">
            <div className="h-4 w-40 bg-surface-container rounded mb-3"></div>
            <h2 className="font-headline-sm text-base sm:text-lg text-primary font-semibold">
              {filename}
            </h2>
            <div className="mt-4 flex gap-4">
              <div className="w-20 h-20 rounded-full bg-surface-container"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 bg-surface-container rounded"></div>
                <div className="h-3 w-64 bg-surface-container rounded"></div>
              </div>
            </div>
          </section>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container animate-pulse space-y-2">
                <div className="h-4 w-32 bg-surface-container rounded"></div>
                <div className="h-4 w-full bg-surface-container rounded"></div>
                <div className="h-3 w-2/3 bg-surface-container rounded"></div>
              </div>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Header pageTitle="Verification Results" showBack backHref="/" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
        {/* Backend Connection Error */}
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

        {/* Quota / Rate Limited Banner: only appears when backend status is rate_limited and shows backend error text */}
        {jobStatus === "rate_limited" && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-700">hourglass_top</span>
            <div>
              <h4 className="font-headline-sm text-sm font-bold">Rate Limit Reached (429)</h4>
              <p className="font-ui-body text-xs text-amber-950">
                {jobError || "Gemini API rate limit reached. All verified claims have been preserved."}
              </p>
            </div>
          </div>
        )}

        {/* Pipeline Error Banner: only appears when backend status is error and shows backend error text */}
        {jobStatus === "error" && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 shadow-sm flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-rose-700">error_outline</span>
            <div>
              <h4 className="font-headline-sm text-sm font-bold">Extraction Error Encountered</h4>
              <p className="font-ui-body text-xs text-rose-950">
                {jobError || "The document pipeline encountered an error."}
              </p>
            </div>
          </div>
        )}

        {/* Top Summary & Metric Overview Banner */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary-container text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </span>
              <div>
                <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                  Verification Audit Complete ({claimsList.length} Citations Checked)
                </span>
                <h2 className="font-headline-sm text-base sm:text-lg text-primary font-semibold">
                  {filename}
                </h2>
                {jobId && (
                  <p className="font-ui-body text-xs text-secondary">
                    Job ID: {jobId}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={handleRecheck}
                disabled={isRechecking || !jobId}
                className="px-3 py-1.5 rounded-lg border border-outline-variant font-label-sm text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Re-run Verification Audit"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    isRechecking ? "animate-spin" : ""
                  }`}
                >
                  refresh
                </span>
                <span>Re-check</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  <span>Export</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                </button>

                {isExportOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container py-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        window.print();
                      }}
                      className="w-full px-3 py-2 text-left font-label-sm text-xs text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-red-600">
                        picture_as_pdf
                      </span>
                      Print / Save as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        const blob = new Blob([JSON.stringify(realResults, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `citecheck-${jobId || "results"}.json`;
                        a.click();
                      }}
                      className="w-full px-3 py-2 text-left font-label-sm text-xs text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">
                        code
                      </span>
                      JSON Results
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Metric Ring & Breakdown */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-600"
                    strokeDasharray={`${integrityScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-headline-sm text-lg font-bold text-primary leading-none">
                    {integrityScore}%
                  </span>
                  <span className="font-label-sm text-[9px] uppercase tracking-wider text-secondary font-semibold">
                    Score
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-headline-sm text-sm font-semibold text-primary">
                  Claim Integrity Index
                </h3>
                <p className="font-ui-body text-xs text-secondary leading-snug max-w-sm">
                  {totalCount > 0
                    ? `${supportedCount} of ${totalCount} cited claims verified directly against primary literature.`
                    : "No claims found to evaluate."}
                </p>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setSelectedFilter("SUPPORTED")}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-center border border-emerald-200 cursor-pointer"
              >
                <span className="font-headline-sm text-lg font-bold text-emerald-800 block">
                  {supportedCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase font-semibold text-emerald-700">
                  Supported
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("WEAK")}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-center border border-amber-200 cursor-pointer"
              >
                <span className="font-headline-sm text-lg font-bold text-amber-800 block">
                  {weakCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase font-semibold text-amber-700">
                  Weak
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("MISMATCH")}
                className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors text-center border border-rose-200 cursor-pointer"
              >
                <span className="font-headline-sm text-lg font-bold text-rose-800 block">
                  {mismatchCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase font-semibold text-rose-700">
                  Mismatch
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFilter("UNVERIFIABLE")}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-center border border-slate-300 cursor-pointer"
              >
                <span className="font-headline-sm text-lg font-bold text-slate-800 block">
                  {unverifiableCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase font-semibold text-slate-700">
                  Unindexed
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* View Switcher & Filter Chips Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="bg-surface-container-high p-1 rounded-xl flex items-center shadow-xs w-full sm:w-64">
            <button
              type="button"
              onClick={() => setViewMode("doc")}
              className={`flex-1 py-1.5 px-3 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "doc"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Document View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex-1 py-1.5 px-3 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_list</span>
              <span>List View</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: `All (${claimsList.length})` },
              { id: "SUPPORTED", label: `Supported (${supportedCount})` },
              { id: "WEAK", label: `Weak (${weakCount})` },
              { id: "MISMATCH", label: `Mismatch (${mismatchCount})` },
              { id: "UNVERIFIABLE", label: `Unverifiable (${unverifiableCount})` },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedFilter(chip.id)}
                className={`px-2.5 py-1 rounded-full font-label-sm text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFilter === chip.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-container text-secondary hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State when no claims exist */}
        {claimsList.length === 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 sm:p-12 shadow-sm border border-surface-container text-center">
            <span className="material-symbols-outlined text-[48px] text-secondary mb-3">inventory_2</span>
            <h3 className="font-headline-sm text-base font-semibold text-primary mb-1">
              No Claims Available
            </h3>
            <p className="font-ui-body text-xs text-secondary max-w-sm mx-auto mb-4">
              The backend returned 0 verification results for this document.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors"
            >
              Upload Another Document
            </button>
          </div>
        )}

        {/* View Mode 1: Document View */}
        {claimsList.length > 0 && viewMode === "doc" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-container">
            <div className="mb-4 pb-3 border-b border-surface-container flex items-center justify-between">
              <span className="font-label-sm text-xs uppercase tracking-wider text-secondary">
                Manuscript Draft • Inline Citations
              </span>
              <span className="font-label-sm text-xs text-secondary italic">
                Click any highlighted badge to inspect source passage
              </span>
            </div>

            <article className="font-body-md text-on-surface text-sm sm:text-base leading-relaxed space-y-4">
              <h3 className="font-headline-sm text-lg text-primary font-bold">
                {filename}
              </h3>

              <div className="space-y-4">
                {filteredClaims.map((claim, idx) => (
                  <div
                    key={claim.id || idx}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container"
                  >
                    <p>
                      {claim.draftText}{" "}
                      <button
                        type="button"
                        onClick={() => setSelectedClaim(claim)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-xs font-semibold hover:scale-105 transition-transform cursor-pointer border ${claim.badgeClass}`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{claim.icon}</span>
                        [{claim.claimNumber}] {claim.verdict}
                      </button>
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}

        {/* View Mode 2: List View */}
        {claimsList.length > 0 && viewMode === "list" && (
          <div className="space-y-3.5">
            {filteredClaims.map((claim, idx) => (
              <div
                key={claim.id || idx}
                className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container hover:border-primary-container/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-secondary">
                      Claim {claim.claimNumber} of {claim.totalClaims}
                    </span>
                    <span className="font-label-sm text-xs text-secondary">• {claim.section}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-xs font-semibold ${claim.badgeClass}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">{claim.icon}</span>
                      {claim.verdict}
                    </span>
                  </div>

                  <span className="font-label-sm text-xs text-secondary font-medium">
                    {claim.confidence}% Confidence
                  </span>
                </div>

                <p className="font-body-md text-sm text-on-surface mb-3 leading-relaxed">
                  “{claim.draftText}”
                </p>

                <div className="p-3 rounded-xl bg-surface-container-low text-xs text-secondary mb-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                    menu_book
                  </span>
                  <div>
                    <strong className="text-on-surface block">{claim.citationTitle}</strong>
                    <span>{claim.citationAuthors}</span>
                    {claim.citationDoi && (
                      <span className="block text-[11px] text-outline font-mono mt-0.5">
                        DOI: {claim.citationDoi}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs">
                  <span className="font-ui-body text-secondary text-[11px] truncate max-w-sm">
                    {claim.confidenceDescription}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClaim(claim)}
                      className="px-3 py-1 rounded-lg bg-surface-container font-label-sm text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      Quick Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (claim.raw && typeof window !== "undefined") {
                          sessionStorage.setItem("selectedClaimDetail", JSON.stringify(claim.raw));
                        }
                        router.push(`/inspector?claimIndex=${claim.claimNumber - 1}`);
                      }}
                      className="px-3 py-1 rounded-lg bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Deep Inspector</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Claim Inspection Bottom Sheet / Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
            <div
              className="w-full sm:max-w-2xl bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl shadow-2xl border border-surface-container overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet Header */}
              <div className="p-4 sm:p-5 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-xs font-semibold ${selectedClaim.badgeClass}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{selectedClaim.icon}</span>
                    {selectedClaim.verdict}
                  </span>
                  <span className="font-label-sm text-xs text-secondary font-medium">
                    Claim {selectedClaim.claimNumber} of {selectedClaim.totalClaims}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Sheet Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                <div>
                  <span className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Manuscript Assertion
                  </span>
                  <blockquote className="p-3.5 rounded-xl bg-surface-container-low border-l-4 border-primary font-body-md text-sm text-on-surface leading-relaxed">
                    “{selectedClaim.draftText}”
                  </blockquote>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-sm text-xs font-semibold text-primary">
                      Primary Source Canonical Evidence
                    </span>
                    <span className="font-label-sm text-xs text-secondary">
                      {selectedClaim.page}
                    </span>
                  </div>
                  <p className="font-ui-body text-xs text-secondary mb-2">
                    {selectedClaim.citationTitle} {selectedClaim.citationAuthors ? `• ${selectedClaim.citationAuthors}` : ""}
                  </p>
                  <blockquote className="p-3 rounded-lg bg-surface-container-lowest font-body-md text-sm text-on-surface border border-outline-variant/50 leading-relaxed">
                    {selectedClaim.sourceText}
                  </blockquote>
                </div>
              </div>

              {/* Sheet Footer */}
              <div className="p-4 sm:p-5 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="px-4 py-2 rounded-xl font-label-sm text-xs font-medium text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedClaim.raw && typeof window !== "undefined") {
                      sessionStorage.setItem("selectedClaimDetail", JSON.stringify(selectedClaim.raw));
                    }
                    router.push(`/inspector?claimIndex=${selectedClaim.claimNumber - 1}`);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Claim Inspector</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
