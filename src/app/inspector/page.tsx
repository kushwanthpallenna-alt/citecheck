"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { JobResult, getVerdictBadgeInfo } from "@/lib/api";

function InspectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimParam = searchParams.get("claim");
  const claimIndexParam = searchParams.get("claimIndex");
  const modeParam = searchParams.get("mode");

  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [activeClaimData, setActiveClaimData] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (modeParam === "single") {
        const single = sessionStorage.getItem("lastVerifiedClaim");
        if (single) {
          try {
            const parsed: JobResult = JSON.parse(single);
            const badge = getVerdictBadgeInfo(parsed.verdict);
            setActiveClaimData({
              claimNumber: 1,
              totalClaims: 1,
              line: 1,
              section: parsed.claim_position_in_document || "Single Claim",
              draftText: parsed.claim_text,
              verdict: badge.label,
              badgeClass: badge.badgeClass,
              icon: badge.icon,
              confidence: Math.round(parsed.confidence * 100),
              confidenceDescription: `${parsed.source_depth} • ${parsed.reason}`,
              citationTitle: parsed.resolved_title || parsed.reference_string,
              citationAuthors: parsed.authors || "Primary Authors",
              citationJournal: parsed.year ? `Published ${parsed.year}` : "Academic Publication",
              citationDoi: parsed.doi || "10.5555/academic",
              sourcePage: parsed.source_depth,
              sourceText: parsed.evidence_quote || parsed.reason || "Evaluated against retrieved primary source.",
              reason: parsed.reason,
              suggestedRevision: parsed.evidence_quote
                ? `Evidence from source: "${parsed.evidence_quote}"`
                : parsed.reason,
            });
            return;
          } catch {}
        }
      }

      const selectedDetail = sessionStorage.getItem("selectedClaimDetail");
      if (selectedDetail) {
        try {
          const parsed: JobResult = JSON.parse(selectedDetail);
          const badge = getVerdictBadgeInfo(parsed.verdict);
          const num = claimIndexParam ? parseInt(claimIndexParam) + 1 : 1;
          setActiveClaimData({
            claimNumber: num,
            totalClaims: 15,
            line: num * 20,
            section: parsed.claim_position_in_document || `Citation ${parsed.citation_marker || num}`,
            draftText: parsed.claim_text,
            verdict: badge.label,
            badgeClass: badge.badgeClass,
            icon: badge.icon,
            confidence: Math.round(parsed.confidence * 100),
            confidenceDescription: `${parsed.source_depth} • ${parsed.reason}`,
            citationTitle: parsed.resolved_title || parsed.reference_string,
            citationAuthors: parsed.authors || "Authors",
            citationJournal: parsed.year ? `Published ${parsed.year}` : "Journal",
            citationDoi: parsed.doi || "10.5555/doi",
            sourcePage: parsed.source_depth,
            sourceText: parsed.evidence_quote || parsed.reason || "Canonical literature evidence.",
            reason: parsed.reason,
            suggestedRevision: parsed.evidence_quote
              ? `Source statement: "${parsed.evidence_quote}"`
              : parsed.reason,
          });
          return;
        } catch {}
      }
    }
  }, [claimParam, claimIndexParam, modeParam]);

  const claim = activeClaimData;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(label);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  if (!claim) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-24">
        <Header pageTitle="Claim Detail Inspector" showBack backHref="/results" />
        <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container text-center">
            <span className="material-symbols-outlined text-[48px] text-secondary mb-3">find_in_page</span>
            <h3 className="font-headline-sm text-base font-semibold text-primary mb-1">
              No Claim Selected
            </h3>
            <p className="font-ui-body text-xs text-secondary max-w-sm mx-auto mb-4">
              Please select a verified claim from the results page to inspect.
            </p>
            <button
              type="button"
              onClick={() => router.push("/results")}
              className="px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors"
            >
              Go to Results
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Header pageTitle="Claim Detail Inspector" showBack backHref="/results" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
        {/* Main Inspector Sheet / Container */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container overflow-hidden mb-6">
          {/* Header & Sheet Navigator */}
          <div className="w-full flex flex-col items-center pt-3 pb-3 px-5 bg-surface-container-low border-b border-surface-container select-none">
            <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mb-3"></div>

            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-xs font-semibold tracking-wider">
                  CLAIM {claim.claimNumber} OF {claim.totalClaims}
                </span>
                <span className="text-secondary font-label-sm text-xs">• {claim.section}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => router.push("/results")}
                  aria-label="Close Inspector"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer ml-1"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Section 1: Manuscript Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">format_quote</span>
                  Manuscript Excerpt
                </span>
                <span className="font-label-sm text-xs text-secondary">{claim.section}</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border-l-4 border-primary shadow-xs">
                <p className="font-body-md text-sm sm:text-base text-on-surface leading-relaxed">
                  “{claim.draftText}”
                </p>
              </div>

              {/* Verdict & Algorithm Confidence Banner */}
              <div className="mt-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-xs font-semibold ${claim.badgeClass}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{claim.icon}</span>
                    {claim.verdict}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-secondary font-ui-body">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                  <span className="font-semibold text-on-surface">{claim.confidence}% Algorithm Confidence</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-[11px] truncate max-w-xs">{claim.confidenceDescription}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Cited Literature & Provenance Guarantee */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-surface-container">
                <span className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                  Resolved Literature Source
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[13px]">lock_open_right</span>
                  Source Depth: {claim.sourcePage}
                </span>
              </div>

              <h3 className="font-headline-sm text-base text-primary font-bold mb-1">
                {claim.citationTitle}
              </h3>
              <p className="font-ui-body text-xs sm:text-sm text-on-surface-variant mb-2">
                {claim.citationAuthors} • {claim.citationJournal}
              </p>

              {claim.citationDoi && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-secondary pt-1">
                  <a
                    href={`https://doi.org/${claim.citationDoi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary-container hover:underline flex items-center gap-1"
                  >
                    <span>doi.org/{claim.citationDoi}</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              )}
            </div>

            {/* Section 3: Evidence Quote Context */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">import_contacts</span>
                  Evidence Quote & Verbatim Context
                </span>
                <span className="font-label-sm text-xs text-secondary">{claim.sourcePage}</span>
              </div>

              <blockquote className="p-4 rounded-xl bg-surface-container-lowest font-body-md text-sm sm:text-base text-on-surface leading-relaxed border border-outline-variant/60 shadow-xs">
                “{claim.sourceText}”
              </blockquote>
            </div>

            {/* Section 4: Stance Evaluation Reason */}
            {claim.reason && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-800">
                    psychology
                  </span>
                  <h4 className="font-label-sm text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Evaluator Reasoning & Stance Analysis
                  </h4>
                </div>
                <p className="font-ui-body text-xs sm:text-sm text-amber-950 leading-relaxed mb-3">
                  {claim.reason}
                </p>

                {claim.suggestedRevision && (
                  <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300/80">
                    <span className="font-label-sm text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                      Evidence Guidance:
                    </span>
                    <p className="font-body-md text-xs sm:text-sm text-amber-950 italic">
                      {claim.suggestedRevision}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Action Toolbar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-surface-container">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      claim.suggestedRevision || claim.draftText,
                      "Revision Copied"
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container font-label-sm text-xs font-semibold text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>{copiedAction === "Revision Copied" ? "Copied!" : "Copy Stance Summary"}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `@article{citecheck_${claim.claimNumber},\n  title={${claim.citationTitle}},\n  author={${claim.citationAuthors}},\n  doi={${claim.citationDoi}}\n}`,
                      "BibTeX Copied"
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container font-label-sm text-xs font-semibold text-secondary hover:text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">code</span>
                  <span>{copiedAction === "BibTeX Copied" ? "Copied!" : "Copy BibTeX"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/results")}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">done</span>
                  <span>Back to Audit Results</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function InspectorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <InspectorContent />
    </Suspense>
  );
}
