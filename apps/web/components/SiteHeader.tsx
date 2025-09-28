"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/creator", label: "Creator" },
  { href: "/governance", label: "Governance" },
];

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}

function NavLink({ href, label, isActive, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? "text-primary-600 dark:text-primary-300"
          : "text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-300"
      }`}
    >
      {label}
    </Link>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-sticky border-b border-gray-200/70 bg-white/80 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/80">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Experience Protocol home">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
              <Image
                src="/logo_ep.png"
                alt="Experience Protocol logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Experience Protocol
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Token-gated experiences on Sepolia
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
              return (
                <NavLink key={link.href} {...link} isActive={Boolean(isActive)} />
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <WalletButton size="sm" />
            </div>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300 dark:hover:border-primary-500 dark:hover:text-primary-300 md:hidden"
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                className={`h-5 w-5 transition-transform ${isMenuOpen ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 7h16M4 12h16M10 17h10" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden transition-all duration-200 ease-out ${
          isMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div className="border-t border-gray-200/80 bg-white/95 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Image
                  src="/logo_ep.png"
                  alt="Experience Protocol logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Experience Protocol</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Comprehensive access tooling</span>
              </div>
            </div>
            <nav className="flex flex-col gap-1 py-2">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
                return (
                  <NavLink
                    key={`mobile-${link.href}`}
                    {...link}
                    isActive={Boolean(isActive)}
                    onNavigate={() => setIsMenuOpen(false)}
                  />
                );
              })}
            </nav>
            <div className="border-t border-gray-200 py-4 dark:border-slate-700">
              <WalletButton size="sm" className="w-full justify-center" showFullAddress />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
