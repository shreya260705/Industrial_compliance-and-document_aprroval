import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Building2,
  Lock,
  FileCheck,
  Calendar,
  Award,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const PlatformCapabilitiesSection = () => {
  const capabilities = [
    {
      id: 'kya',
      title: '1. Know Your Approvals (KYA)',
      tagline: 'Deterministic Rule Engine',
      description:
        'Multi-factorial compliance discovery engine evaluating CPCB pollution scoring (Red/Orange/Green/White), power load in HP, hazardous chemicals inventory, and workforce scale.',
      icon: Compass,
      route: '/kya',
      ctaText: 'Launch KYA Engine',
      color: 'text-brand-deep-sage',
      badgeColor: 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/40',
      highlights: ['CPCB Categorization', 'Central & State Clearances', 'Document Checklists'],
    },
    {
      id: 'facilities',
      title: '2. Multi-Location Facilities',
      tagline: 'Multi-Location Siting',
      description:
        'Unified corporate umbrella managing manufacturing facilities, logistics hubs, and commercial establishments with individual site manager delegations.',
      icon: Building2,
      route: '/facilities',
      ctaText: 'Manage Business Locations',
      color: 'text-brand-walnut',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      highlights: ['Multi-State Location Registry', 'Location Compliance Health', 'Site Delegation'],
    },
    {
      id: 'vault',
      title: '3. Secure Document Vault',
      tagline: 'Zero-Knowledge Encrypted Storage',
      description:
        'Encrypted repository for architectural blueprints, EIA clearances, land title deeds, and fire NOCs. Features SHA-256 cryptographic checksums for tamper-proof evidence reuse.',
      icon: Lock,
      route: '/vault',
      ctaText: 'Open Document Vault',
      color: 'text-brand-deep-sage',
      badgeColor: 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/40',
      highlights: ['SHA-256 Fingerprinting', 'One-Click Reuse', 'Encrypted Cloud Storage'],
    },
    {
      id: 'applications',
      title: '4. Application Preparation & Tracking',
      tagline: 'Standardized Submission Dossiers',
      description:
        'Assemble unified clearance dossiers with auto-attached vault blueprints, statutory declarations, live SLA countdown timers, and downloadable PDF acknowledgements.',
      icon: FileCheck,
      route: '/applications',
      ctaText: 'View Applications',
      color: 'text-brand-amber',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      highlights: ['Statutory SLA Timers', 'PDF Acknowledgements', 'Dossier Assembly'],
    },
    {
      id: 'compliance',
      title: '5. Compliance Calendar & Renewals',
      tagline: 'Continuous Regulatory Radar',
      description:
        'Automated statutory compliance calendar tracking Form V environmental statements, annual factory renewals, and hazardous waste returns with 90/60/30-day proactive escalation alerts.',
      icon: Calendar,
      route: '/compliance/calendar',
      ctaText: 'Explore Compliance Radar',
      color: 'text-brand-deep-sage',
      badgeColor: 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/40',
      highlights: ['Form V Due Reminders', 'Consent Expiry Radar', 'SLA Escalations'],
    },
    {
      id: 'schemes',
      title: '6. Government Schemes & Incentives',
      tagline: 'National Financial Support Engine',
      description:
        'Statutory eligibility evaluator for CGTMSE credit guarantees, PLI Automotive incentives, PMKSY food processing capital subsidies, and PM-KUSUM decentralized solar schemes.',
      icon: Award,
      route: '/schemes',
      ctaText: 'Explore Schemes Catalogue',
      color: 'text-brand-walnut',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      highlights: ['CGTMSE 1 Apr 2025 Schedule', 'PLI-Auto Eligibility', 'Self-Attested Dossiers'],
    },
    {
      id: 'officer-desk',
      title: '7. Officer Scrutiny & Clarification',
      tagline: 'Transparent Department Workflow',
      description:
        'Structured departmental dialogue desk allowing scrutiny officers to issue deficiency queries with automatically paused SLA timers, preventing premature rejections.',
      icon: Users,
      route: '/officer/queue',
      ctaText: 'Access Officer Desk',
      color: 'text-brand-deep-sage',
      badgeColor: 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/40',
      highlights: ['Zero Arbitrary Rejection', 'SLA Clock Pausing', 'Audited Dialogue Notes'],
    },
    {
      id: 'grievances',
      title: '8. Grievance Redressal & Escalation',
      tagline: 'Statutory Accountability Engine',
      description:
        'Multi-tiered dispute redressal engine with automated SLA-breach escalations (L1 Officer to L2 Department Head to L3 Super Admin) backed by an immutable audit trail.',
      icon: AlertTriangle,
      route: '/grievances',
      ctaText: 'Open Grievance Desk',
      color: 'text-brand-amber',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
      highlights: ['3-Tier Escalation Chain', 'Automated SLA Timers', 'Immutable Audit History'],
    },
  ];

  return (
    <section id="capabilities" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-deep-sage" />
            End-to-End Compliance Lifecycle
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            Eight Unified Capabilities. One National Workspace.
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            Eliminating fragmented state-by-state compliance siloes through an integrated platform engineered for industrial business owners, compliance counsel, and departmental scrutiny officers.
          </p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-brand-sage/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar with Icon & Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 group-hover:bg-brand-pale-sage/30 transition-colors">
                      <Icon className={`h-6 w-6 ${cap.color}`} />
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${cap.badgeColor}`}
                    >
                      {cap.tagline}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-brand-charcoal mb-2 leading-snug">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed mb-4">
                    {cap.description}
                  </p>

                  {/* Highlight Bullets */}
                  <div className="space-y-1.5 mb-5 pt-3 border-t border-stone-100">
                    {cap.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Valid Route Navigation CTA */}
                <Link to={cap.route} className="block pt-2">
                  <button className="w-full py-2 px-3 rounded-lg border border-stone-200 hover:border-brand-deep-sage hover:bg-brand-pale-sage/20 text-brand-deep-sage text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                    <span>{cap.ctaText}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
