import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Building2,
  CheckCircle2,
  Search,
  Sparkles,
  Layers,
  Lock,
  Compass,
} from 'lucide-react';
import { IndiaMapVisual } from './IndiaMapVisual';

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-brand-cream pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-stone-200">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#303A34_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT COLUMN: Strategic National Value Proposition (7 cols on lg) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/50 text-brand-deep-sage text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="h-4 w-4 text-brand-deep-sage" />
              <span>ONE NATION. ONE INDUSTRIAL COMPLIANCE WORKSPACE.</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-brand-charcoal tracking-tight leading-[1.15]">
              Start, Expand & Manage Your Business{' '}
              <span className="text-brand-deep-sage relative inline-block">
                Anywhere in India.
                <span className="absolute left-0 bottom-1 w-full h-2.5 bg-brand-sage/30 -z-10 rounded-sm" />
              </span>
            </h1>

            {/* Exact Required Description */}
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
              Discover relevant industrial approvals, manage multi-location facilities, organize documents and track compliance obligations through one unified workspace.
            </p>

            {/* Primary & Secondary Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/catalogue">
                <button className="px-6 py-3 rounded-xl bg-brand-deep-sage hover:bg-[#283b31] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 group">
                  <span>Explore Approvals</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>

              <Link to="/register">
                <button className="px-6 py-3 rounded-xl bg-brand-amber hover:bg-[#c27616] text-brand-charcoal text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Register Your Enterprise</span>
                </button>
              </Link>
            </div>

            {/* Demo Role Switcher Shortcut Pill */}
            <div className="p-3.5 rounded-xl bg-white/90 border border-stone-200/90 shadow-sm max-w-xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono text-[11px] font-bold text-brand-charcoal flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-amber" />
                  Quick Sandbox Evaluation:
                </span>
                <Link
                  to="/login"
                  className="text-[11px] font-semibold text-brand-deep-sage hover:underline"
                >
                  Open Role Switcher →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <Link
                  to="/login"
                  className="p-1.5 rounded bg-brand-pale-sage/50 hover:bg-brand-pale-sage border border-brand-sage/30 text-brand-deep-sage font-semibold truncate transition-colors"
                >
                  🏢 Business Owner
                </Link>
                <Link
                  to="/login"
                  className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-semibold truncate transition-colors"
                >
                  ⚖️ Scrutiny Officer
                </Link>
                <Link
                  to="/login"
                  className="p-1.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-brand-charcoal font-semibold truncate transition-colors"
                >
                  🛡️ Super Admin
                </Link>
              </div>
            </div>

            {/* Feature Highlights Tickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs text-stone-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>28 States & 8 UTs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Encrypted Vault</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Gazette Citations</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Large Animated Visual Composition (6 cols on lg) */}
          <div className="lg:col-span-6 xl:col-span-6">
            <IndiaMapVisual />
          </div>
        </div>
      </div>
    </section>
  );
};
