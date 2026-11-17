import React from 'react';
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2, Lock, ExternalLink, HelpCircle } from 'lucide-react';

export const TrustDisclaimerSection = () => {
  const classifications = [
    {
      title: 'Verified Regulatory Information',
      badge: 'VERIFIED',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description:
        'Backed by specific Gazette notifications, statutory acts (Water Act 1974, Air Act 1981, Petroleum Rules 2002, Factories Act 1948), and ministry memorandums with recorded last-verified timestamps.',
      icon: CheckCircle2,
      iconColor: 'text-emerald-700',
    },
    {
      title: 'Model & Indicative Frameworks',
      badge: 'INDICATIVE',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      description:
        'Derived from model state frameworks, standard single-window templates, and industrial cluster best practices. Intended for preparatory planning prior to formal filing.',
      icon: FileText,
      iconColor: 'text-sky-700',
    },
    {
      title: 'Needs Confirmation Records',
      badge: 'NEEDS_CONFIRMATION',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      description:
        'Rules and clearance parameters awaiting updated Gazette amendments or state department notification verifications. Explicitly tagged to alert compliance teams.',
      icon: AlertTriangle,
      iconColor: 'text-brand-amber',
    },
    {
      title: 'Sandboxed Demonstration Data',
      badge: 'DEMO DATA',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      description:
        'Pre-seeded enterprises (e.g. Horizon AutoTech Pvt Ltd) and sample business facilities engineered to demonstrate multi-facility compliance, officer scrutiny, and grievance redressal.',
      icon: Lock,
      iconColor: 'text-purple-700',
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-deep-sage" />
            Statutory Integrity & Data Transparency
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            Data Classification & Platform Legal Boundaries
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            BizPermit operates under strict data classification standards. We believe industrial enterprises deserve complete transparency regarding the statutory origin and audit status of every compliance rule.
          </p>
        </div>

        {/* 4 Classification Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {classifications.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="bg-stone-50/60 border border-stone-200 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`h-5 w-5 ${c.iconColor}`} />
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${c.badgeColor}`}
                    >
                      {c.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-brand-charcoal mb-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {c.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prominent Legal Boundary Box */}
        <div className="p-6 rounded-2xl bg-amber-50/40 border border-amber-200/90 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-900 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="space-y-2 text-xs text-stone-700">
              <h4 className="text-sm font-bold text-brand-charcoal">
                Statutory Notice & Prototype Disclaimer (SIH26130)
              </h4>
              <p className="leading-relaxed">
                <strong>BizPermit is an independent national industrial compliance research prototype</strong> developed to address Problem Statement SIH26130. It is <strong>NOT an official portal of the Government of India</strong>, is not affiliated with the National Single Window System (NSWS) or Invest India, and does not possess statutory power to grant, issue, or revoke industrial approvals, licenses, or permits.
              </p>
              <p className="leading-relaxed text-stone-600">
                All statutory filings, fee disbursements, and formal submissions must be completed through the respective competent authorities (e.g. State Single Window Portals, MoEFCC PARIVESH, PESO Online, FSSAI FoSCoS). BizPermit serves exclusively as an internal preparation, multi-location organization, and continuous compliance monitoring workspace for business enterprises.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
