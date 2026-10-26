"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function StatesPage() {
  const [activeState, setActiveState] = useState<"empty" | "error" | "ratelimit" | "paywalled">("empty");
  const [timer, setTimer] = useState("14h 22m 08s");

  useEffect(() => {
    let totalSeconds = 14 * 3600 + 22 * 60 + 8;
    const interval = setInterval(() => {
      totalSeconds = Math.max(0, totalSeconds - 1);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimer(
        `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(
          seconds
        ).padStart(2, "0")}s`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Header pageTitle="System Diagnostic Hub" showBack backHref="/" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
        {/* State Mode Selector Toolbar */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-label-sm text-xs text-secondary uppercase tracking-wider font-semibold">
              System Diagnostic Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              Interactive State Demos
            </span>
          </div>

          <div className="w-full bg-surface-container-high p-1 rounded-xl flex items-center justify-between gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveState("empty")}
              className={`flex-1 py-2 px-2 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeState === "empty"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span>Empty</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveState("error")}
              className={`flex-1 py-2 px-2 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeState === "error"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">error_outline</span>
              <span>Extraction Error</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveState("ratelimit")}
              className={`flex-1 py-2 px-2 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeState === "ratelimit"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              <span>Rate Limit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveState("paywalled")}
              className={`flex-1 py-2 px-2 rounded-lg font-label-sm text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeState === "paywalled"
                  ? "bg-surface-container-lowest text-primary shadow-xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Paywall</span>
            </button>
          </div>
        </section>

        {/* State 1: Empty State */}
        {activeState === "empty" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-10 shadow-sm border border-surface-container text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-primary-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[36px]">find_in_page</span>
            </div>

            <div className="max-w-md mx-auto">
              <span className="font-label-sm text-xs text-secondary uppercase tracking-widest font-semibold block mb-1">
                Manuscript Provenance Engine
              </span>
              <h3 className="font-headline-lg text-2xl text-primary font-bold mb-2">
                No verification results yet
              </h3>
              <p className="font-ui-body text-secondary text-sm leading-relaxed">
                Upload a research manuscript (PDF, DOCX) or paste an excerpt with citations to run
                automated claim-by-claim provenance checks against indexed literature.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white font-label-md text-sm font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Upload Document</span>
              </Link>
              <Link
                href="/results"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md text-sm font-semibold text-primary transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">science</span>
                <span>Load Sample (Zhang et al. 2023)</span>
              </Link>
            </div>

            {/* How It Works Informational Section */}
            <div className="pt-8 border-t border-surface-container grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-white font-label-sm text-xs font-bold mb-2">
                  1
                </span>
                <h4 className="font-label-sm text-sm font-semibold text-primary mb-1">
                  Claim & Anchor Detection
                </h4>
                <p className="font-ui-body text-xs text-secondary leading-relaxed">
                  Parses parenthetical citations and footnotes to match assertions with source
                  bibliographies and DOI links.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-white font-label-sm text-xs font-bold mb-2">
                  2
                </span>
                <h4 className="font-label-sm text-sm font-semibold text-primary mb-1">
                  Full-Text Semantic Alignment
                </h4>
                <p className="font-ui-body text-xs text-secondary leading-relaxed">
                  Fetches open-access canonical papers to verify whether the original data supports
                  or contradicts the assertion.
                </p>
              </div>
            </div>

            <blockquote className="italic font-citation-quote text-xs text-secondary max-w-sm mx-auto">
              “Extraordinary scientific claims require extraordinary source concordance.” — CiteCheck
              Integrity Standard
            </blockquote>
          </div>
        )}

        {/* State 2: OCR / Extraction Error */}
        {activeState === "error" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-container space-y-6">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">gpp_maybe</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    Code: ERR_OCR_EMPTY
                  </span>
                  <span className="font-label-sm text-xs font-semibold text-rose-800">
                    Parser Malfunction
                  </span>
                </div>
                <h3 className="font-headline-sm text-base text-rose-900 font-bold mb-1">
                  Extraction Error & Unresolved Citations
                </h3>
                <p className="font-ui-body text-xs sm:text-sm text-rose-950 leading-relaxed">
                  The document pipeline encountered two critical blockers preventing full citation
                  extraction:
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-amber-600 mt-0.5">
                  warning
                </span>
                <div className="text-xs">
                  <strong className="text-on-surface block font-semibold mb-0.5">
                    Unreadable Scanned PDF Table (Lines 45–80)
                  </strong>
                  <p className="text-secondary leading-relaxed">
                    The document contained bitmap-only raster scans without embedded font glyphs or
                    OCR text layers.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-rose-600 mt-0.5">
                  cancel
                </span>
                <div className="text-xs">
                  <strong className="text-on-surface block font-semibold mb-0.5">
                    Unresolvable CrossRef Citation (Citation [12] - Rosenblatt Lab 1962)
                  </strong>
                  <p className="text-secondary leading-relaxed">
                    Historical memorandum could not resolve through CrossRef, PubMed, or arXiv
                    metadata APIs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload Text-Layer PDF</span>
              </Link>
              <Link
                href="/results"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-sm text-xs font-semibold text-secondary transition-colors flex items-center justify-center gap-2"
              >
                <span>Ignore & Review Other 14 Claims</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Daily Verification Quota Reached */}
        {activeState === "ratelimit" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-container space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
            </div>

            <div className="max-w-md mx-auto">
              <span className="font-label-sm text-xs text-secondary uppercase tracking-widest font-semibold block mb-1">
                Tier Allocation Exceeded
              </span>
              <h3 className="font-headline-lg text-2xl text-primary font-bold mb-2">
                Daily Verification Quota Reached
              </h3>
              <p className="font-ui-body text-secondary text-sm leading-relaxed">
                Free academic tier includes 5 document audits per 24 hours. Your quota will reset
                automatically:
              </p>
            </div>

            {/* Countdown Timer Display */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container max-w-xs mx-auto">
              <span className="font-label-sm text-[11px] text-secondary uppercase tracking-wider block mb-1">
                Quota Resets In
              </span>
              <span className="font-mono text-2xl font-bold text-primary">{timer}</span>
            </div>

            <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 max-w-lg mx-auto text-left">
              <div className="flex items-center gap-2 mb-1.5 font-label-sm text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[18px]">school</span>
                Institutional Access Unlocks
              </div>
              <p className="font-ui-body text-xs text-secondary leading-relaxed mb-3">
                Universities and research laboratories with Shibboleth or InCommon Single Sign-On receive
                unlimited multi-paper verification passes.
              </p>
              <button
                type="button"
                onClick={() => alert("Redirecting to Institutional SSO login...")}
                className="px-4 py-2 rounded-lg bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                <span>Connect Institutional Login (SSO)</span>
              </button>
            </div>
          </div>
        )}

        {/* State 4: Paywalled Source Warning */}
        {activeState === "paywalled" && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-container space-y-6">
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
              <div>
                <span className="font-label-sm text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-0.5">
                  Full-Text Restricted
                </span>
                <h3 className="font-headline-sm text-base text-slate-900 font-bold mb-1">
                  Paywalled Primary Source Warning
                </h3>
                <p className="font-ui-body text-xs sm:text-sm text-slate-800 leading-relaxed">
                  The cited article is hosted behind a commercial journal paywall. CiteCheck verified
                  abstract and metadata stances, but deep passage concordance requires institutional proxy access.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
              <h4 className="font-label-sm text-xs font-semibold text-primary mb-2">
                Available Provenance Options:
              </h4>
              <ul className="space-y-2 font-ui-body text-xs text-secondary">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                  <span>Connect University EZProxy / VPN for automatic licensed access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                  <span>Upload local preprint PDF or author-accepted manuscript (AAM)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                  <span>Review with Abstract & Metadata confidence rating (78% match)</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/results"
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>Continue to Results</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
