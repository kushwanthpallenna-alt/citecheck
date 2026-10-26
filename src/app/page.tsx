"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { SAMPLE_MANUSCRIPT } from "@/data/mockData";
import { analyzeDocument, verifySingleClaim } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"document" | "claim">("document");
  const [manuscriptText, setManuscriptText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationMode, setVerificationMode] = useState<"strict" | "semantic" | "quantitative">("strict");

  // Single claim form states
  const [singleClaim, setSingleClaim] = useState("");
  const [singleSource, setSingleSource] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await analyzeDocument(selectedFile, manuscriptText);
      if (res && res.job_id) {
        const fname = selectedFile ? encodeURIComponent(selectedFile.name) : encodeURIComponent("Pasted text");
        router.push(`/analyzing?jobId=${res.job_id}&filename=${fname}`);
        return;
      }
    } catch (err: any) {
      console.warn("Backend API unavailable or error:", err);
      setErrorMessage(err.message || "Failed to start document verification pipeline");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillSampleClaim = () => {
    setSingleClaim(
      "Recent findings prove that increasing model parameter size strictly decreases catastrophic forgetting across continuous learning benchmarks."
    );
    setSingleSource("Vaswani, Marcus & Bengio (2023). Capacity Limits in Continual Neural Representations. JMLR.");
  };

  const handleVerifySingleClaim = async () => {
    if (!singleClaim.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifySingleClaim(singleClaim, singleSource);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lastVerifiedClaim", JSON.stringify(res));
      }
      router.push("/inspector?mode=single");
    } catch (err: any) {
      console.warn("Backend single verify error:", err);
      setErrorMessage(err.message || "Verification failed");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-24">
      <Header pageTitle="Upload & Verify" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin pt-20">
        {/* Top Provenance Engine Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-xs font-semibold tracking-wide">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            Provenance Engine v2.4 (FastAPI Connected)
          </span>
          <span className="text-secondary font-label-sm text-xs">• 1.4B Indexed Papers</span>
        </div>

        {/* Hero Section */}
        <section className="mb-6">
          <h2 className="font-display-lg text-2xl sm:text-3xl text-primary font-bold tracking-tight mb-2">
            “Does the source really say that?”
          </h2>
          <p className="font-ui-body text-secondary text-sm sm:text-base leading-relaxed max-w-2xl">
            Verify empirical claims against cited publications with AI-assisted provenance checks,
            primary literature retrieval, and exact contextual alignment.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-700">info</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="w-full bg-surface-container-high p-1 rounded-xl flex items-center mb-6 shadow-xs max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={`flex-1 py-2 px-3 rounded-lg font-label-sm text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "document"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-secondary hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">article</span>
            Check a document
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("claim")}
            className={`flex-1 py-2 px-3 rounded-lg font-label-sm text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "claim"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-secondary hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">find_in_page</span>
            Check a single claim
          </button>
        </div>

        {/* Tab 1: Check a Document */}
        {activeTab === "document" && (
          <div className="space-y-5">
            {/* File Upload Dropzone */}
            <div className="border-2 border-dashed border-outline-variant hover:border-primary-container rounded-2xl p-6 bg-surface-container-low transition-colors text-center relative">
              {selectedFile ? (
                <div className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">check_circle</span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-label-sm text-sm font-semibold text-on-surface truncate">
                        {selectedFile.name}
                      </p>
                      <p className="font-label-sm text-xs text-secondary">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for backend analysis
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-secondary hover:text-error transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-primary-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[26px]">upload_file</span>
                  </div>
                  <p className="font-label-sm text-sm font-semibold text-on-surface mb-1">
                    Drop PDF, DOCX, or TXT file here
                  </p>
                  <p className="font-ui-body text-xs text-secondary mb-4">
                    or browse files from your workstation
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-highest text-primary font-label-sm text-xs font-semibold cursor-pointer hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[16px]">file_open</span>
                    Choose Document
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-surface-container/60">
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-surface-container text-secondary">
                  PDF up to 15MB
                </span>
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-surface-container text-secondary">
                  DOCX
                </span>
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-surface-container text-secondary">
                  TXT
                </span>
              </div>
            </div>

            {/* Manuscript Text Editor Area */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container">
              <div className="flex items-center justify-between mb-2">
                <label className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  Manuscript Excerpt & Citations
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManuscriptText(SAMPLE_MANUSCRIPT)}
                    className="text-xs text-primary-container hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">science</span>
                    Load Sample Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setManuscriptText("")}
                    className="text-xs text-secondary hover:text-error transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <textarea
                value={manuscriptText}
                onChange={(e) => setManuscriptText(e.target.value)}
                rows={7}
                placeholder="Paste manuscript excerpt or bibliography text here..."
                className="w-full p-3.5 rounded-xl bg-surface-container-low font-body-md text-sm text-on-surface border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all resize-y"
              />
            </div>

            {/* Verification Depth Options */}
            <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container">
              <span className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-2.5">
                Verification Stance & Rigor
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setVerificationMode("strict")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    verificationMode === "strict"
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-surface-container hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-label-sm text-xs font-semibold text-primary mb-1">
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                    Strict Academic Stance
                  </div>
                  <p className="font-ui-body text-[11px] text-secondary leading-tight">
                    Flags subtle polarity shifts, scope inflation, and omitted caveats.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationMode("semantic")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    verificationMode === "semantic"
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-surface-container hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-label-sm text-xs font-semibold text-primary mb-1">
                    <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                    Semantic Alignment
                  </div>
                  <p className="font-ui-body text-[11px] text-secondary leading-tight">
                    Standard corroboration checking factual intent and author conclusions.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationMode("quantitative")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    verificationMode === "quantitative"
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-surface-container hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-label-sm text-xs font-semibold text-primary mb-1">
                    <span className="material-symbols-outlined text-[16px]">calculate</span>
                    Quantitative Fact-Check
                  </div>
                  <p className="font-ui-body text-[11px] text-secondary leading-tight">
                    Validates numerical metrics, percentages, p-values, and benchmark tables.
                  </p>
                </button>
              </div>
            </div>

            {/* Launch Verification CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-primary text-white font-headline-sm text-base font-semibold shadow-lg hover:bg-primary-container active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Initializing Pipeline on Backend...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                      document_scanner
                    </span>
                    <span>Analyze Citations & Provenance</span>
                    <span className="material-symbols-outlined text-[20px] ml-1 group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Check a Single Claim */}
        {activeTab === "claim" && (
          <div className="space-y-4 bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-surface-container">
            <div>
              <label className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                Empirical Claim to Verify
              </label>
              <textarea
                value={singleClaim}
                onChange={(e) => setSingleClaim(e.target.value)}
                rows={3}
                placeholder="e.g. Recent findings prove that increasing model parameter size strictly decreases catastrophic forgetting..."
                className="w-full p-3 rounded-xl bg-surface-container-low font-body-md text-sm text-on-surface border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div>
              <label className="font-label-sm text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                Cited Source, Reference String, or DOI
              </label>
              <input
                type="text"
                value={singleSource}
                onChange={(e) => setSingleSource(e.target.value)}
                placeholder="e.g. 10.5555/jmlr.2023.24.88 or Vaswani et al. (2023)"
                className="w-full p-3 rounded-xl bg-surface-container-low font-ui-body text-sm text-on-surface border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleFillSampleClaim}
                className="inline-flex items-center gap-1.5 text-xs text-primary-container hover:underline font-medium cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Fill Sample Disputed Claim (Continual Learning Study)
              </button>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleVerifySingleClaim}
                disabled={!singleClaim.trim() || isLoading}
                className="w-full py-3.5 px-5 rounded-xl bg-primary text-white font-label-md text-sm font-semibold shadow-md hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Verifying with Backend...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">fact_check</span>
                    <span>Verify Claim Against Source</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="w-8 h-8 rounded-lg bg-secondary-container text-primary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[18px]">public</span>
            </div>
            <h4 className="font-label-sm text-xs font-semibold text-primary mb-1">
              Open Repositories
            </h4>
            <p className="font-ui-body text-xs text-secondary leading-snug">
              Cross-checks CrossRef, OpenAlex, PubMed, and arXiv for open-access PDFs and abstracts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="w-8 h-8 rounded-lg bg-secondary-container text-primary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[18px]">compare</span>
            </div>
            <h4 className="font-label-sm text-xs font-semibold text-primary mb-1">
              Semantic Align & BM25
            </h4>
            <p className="font-ui-body text-xs text-secondary leading-snug">
              BM25 snippet retrieval and Gemini stance verification enforce literal concordance.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="w-8 h-8 rounded-lg bg-secondary-container text-primary-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[18px]">snippet_folder</span>
            </div>
            <h4 className="font-label-sm text-xs font-semibold text-primary mb-1">
              Exact Snippet Recovery
            </h4>
            <p className="font-ui-body text-xs text-secondary leading-snug">
              Pinpoints exact verbatim sentences with strict honesty and fallback rules.
            </p>
          </div>
        </section>

        {/* Advisory Card */}
        <div className="mt-6 p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/40 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">info</span>
          <p className="font-ui-body text-xs text-secondary leading-relaxed">
            <strong className="text-on-surface">Peer Reviewer Advisory:</strong> CiteCheck results
            provide automated provenance indexing. All flags should be verified against cited
            manuscript sections prior to final submission.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
