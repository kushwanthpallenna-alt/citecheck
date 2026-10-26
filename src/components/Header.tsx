"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  pageTitle?: string;
  showBack?: boolean;
  backHref?: string;
}

export default function Header({ pageTitle, showBack = false, backHref }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
      <div className="h-16 px-margin flex items-center justify-between gap-space-sm max-w-5xl mx-auto">
        <div className="flex items-center gap-space-xs min-w-0">
          {showBack && (
            <button
              aria-label="Go back"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              type="button"
              className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-primary-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}

          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[19px]">fact_check</span>
            </div>
            <div className="flex flex-col min-w-0 pl-1">
              <div className="flex items-center gap-1.5">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight truncate">
                  CiteCheck
                </span>
                {pageTitle && (
                  <>
                    <span className="text-outline-variant font-ui-body text-ui-body">/</span>
                    <h1 className="font-label-sm text-label-sm text-secondary truncate font-medium">
                      {pageTitle}
                    </h1>
                  </>
                )}
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant italic truncate">
                Does the source really say that?
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/states"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed text-xs font-semibold hover:opacity-90 transition-opacity"
            title="System Diagnostics & Error Previews"
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>Diagnostics</span>
          </Link>

          <button
            aria-label="Researcher Profile"
            className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary-container p-0.5"
            type="button"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
              JD
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
