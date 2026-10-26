"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Upload", icon: "upload_file", exact: true },
    { href: "/analyzing", label: "Analyzing", icon: "sync_saved_locally" },
    { href: "/results", label: "Results", icon: "fact_check" },
    { href: "/states", label: "States", icon: "rule_folder" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-surface-container shadow-[0_-2px_12px_rgba(15,23,42,0.06)]">
      <div className="flex justify-around items-center h-16 px-space-xs max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === "/" || pathname === "/upload"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-primary-container font-semibold"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-[11px] mt-0.5 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
