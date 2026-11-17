import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Lock,
  FileCheck,
  Clock,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      id: 'discover',
      title: 'Discover Statutory Approvals',
      tagline: 'Know Your Approvals (KYA)',
      icon: Compass,
      route: '/kya',
      ctaText: 'Test KYA Engine',
      description:
        'Input business location, CPCB pollution category (Red/Orange/Green/White), power load in HP, workforce size, and hazardous chemical inventory. The engine automatically derives mandatory pre-establishment and pre-operation clearances.',
      details: [
        'Deterministic rule evaluation based on Central & State Acts',
        'Automatic CPCB pollution score calculation',
        'Transparent statutory citations to Official Gazettes',
      ],
      previewBadge: 'Rule Engine Output: 4 Mandatory Clearances (CTE, Factory License, Fire NOC, Power)',
    },
    {
      num: '02',
      id: 'prepare',
      title: 'Prepare Encrypted Vault',
      tagline: 'Single Document Upload',
      icon: Lock,
      route: '/vault',
      ctaText: 'Explore Vault',
      description:
        'Upload factory architectural blueprints, EIA reports, land purchase deeds, and structural safety certificates to the zero-knowledge encrypted Document Vault once. SHA-256 hashes guarantee file integrity.',
      details: [
        'SHA-256 cryptographic checksums preventing tampering',
        'Single upload reused across multiple state department filings',
        'Zero-knowledge access permissions and secure download links',
      ],
      previewBadge: 'Vault Status: 6 Verified Documents • SHA-256 Fingerprints Active',
    },
    {
      num: '03',
      id: 'submit',
      title: 'Submit & Self-Attest Dossiers',
      tagline: 'Unified Application Assembly',
      icon: FileCheck,
      route: '/applications',
      ctaText: 'View Applications',
      description:
        'Assemble comprehensive application packages with attached blueprints and statutory self-declarations. For incentive schemes (CGTMSE, PLI-Auto), generate verified self-attestation dossiers ready for external submission.',
      details: [
        'Automated document checklist validation before submission',
        'Legal self-attestation statements for scheme filings',
        'Instant downloadable PDF acknowledgements with verification QR',
      ],
      previewBadge: 'Dossier Assembled: BP-DOS-2026-GJ-001 • Ready for Scrutiny',
    },
    {
      num: '04',
      id: 'track',
      title: 'Track Scrutiny & Clarifications',
      tagline: 'Transparent Officer Loop',
      description:
        'Track department scrutiny officers in real time. When clarifications or minor deficiencies arise, officers issue structured notices with automatically paused SLA timers, preventing arbitrary rejections.',
      icon: Clock,
      route: '/officer/queue',
      ctaText: 'Inspect Scrutiny Desk',
      details: [
        'SLA clock automatically paused during clarification requests',
        'Structured query and response dialogue without application re-filing',
        'Audit trail capturing all reviewer actions, notes, and timestamps',
      ],
      previewBadge: 'Scrutiny Desk: 1 Query Answered • SLA Resumed (14 Days Remaining)',
    },
    {
      num: '05',
      id: 'manage',
      title: 'Manage Continuous Renewals',
      tagline: 'Annual Regulatory Radar',
      icon: Calendar,
      route: '/compliance/calendar',
      ctaText: 'Open Compliance Radar',
      description:
        'Compliance does not end with facility commissioning. The automated compliance calendar tracks Form V environmental statements, annual factory license renewals, and hazardous waste returns with 90/60/30-day proactive alerts.',
      details: [
        'Automated calendar recurring obligations generator',
        'Preventive escalation radar alerting compliance leads 90, 60, and 30 days prior',
        'Statutory proof upload for post-compliance audit certification',
      ],
      previewBadge: 'Compliance Calendar: Form V Due 30 Sep • Consent Renewal in 45 Days',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-deep-sage" />
            Standardized Compliance Journey
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            How BizPermit Works: From Siting to Sustained Compliance
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            A cohesive five-stage architecture designed to replace disconnected physical paperwork and separate state department portals with an organized digital compliance loop.
          </p>
        </div>

        {/* Stepper Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {steps.map((st, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStep(idx)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-brand-deep-sage text-white border-brand-deep-sage shadow-md'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isActive ? 'text-brand-amber' : 'text-stone-400'
                    }`}
                  >
                    STEP {st.num}
                  </span>
                  <st.icon
                    className={`h-4 w-4 ${isActive ? 'text-white' : 'text-stone-400'}`}
                  />
                </div>
                <div
                  className={`text-xs font-bold line-clamp-1 ${
                    isActive ? 'text-white' : 'text-brand-charcoal'
                  }`}
                >
                  {st.tagline}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Showcase Card */}
        {(() => {
          const current = steps[activeStep];
          const CurrentIcon = current.icon;
          return (
            <div className="bg-brand-cream/40 border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="grid lg:grid-cols-12 gap-8 items-center">
                {/* Left: Step Description & Details (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-brand-deep-sage text-brand-amber">
                      STAGE {current.num} OF 05
                    </span>
                    <span className="text-xs font-mono text-stone-500 uppercase tracking-wider font-semibold">
                      {current.tagline}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-brand-charcoal mb-3">
                    {current.title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-6">
                    {current.description}
                  </p>

                  <div className="space-y-2.5 mb-8">
                    {current.details.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-brand-charcoal">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{d}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link to={current.route}>
                      <button className="px-5 py-2.5 rounded-lg bg-brand-deep-sage text-white text-xs font-semibold shadow-sm hover:bg-[#283b31] transition-colors flex items-center gap-2">
                        <span>{current.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                    <span className="text-[11px] text-stone-500 font-mono">
                      Real workspace route
                    </span>
                  </div>
                </div>

                {/* Right: Simulated System Artifact Badge (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 shadow-md">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 text-xs">
                    <div className="flex items-center gap-2 font-mono font-bold text-brand-deep-sage">
                      <CurrentIcon className="h-4 w-4 text-brand-sage" />
                      <span>LIVE WORKSPACE PREVIEW</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      STEP {current.num}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 mb-4 font-mono text-xs text-stone-700">
                    <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">
                      Simulated Operational Telemetry:
                    </div>
                    <div className="font-semibold text-brand-deep-sage">
                      {current.previewBadge}
                    </div>
                  </div>

                  <div className="text-xs text-stone-500 leading-relaxed">
                    BizPermit maintains immutable audit records for every step transition. State changes from draft preparation to final statutory sign-off are cryptographically stamped with user and timestamp metadata.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};
