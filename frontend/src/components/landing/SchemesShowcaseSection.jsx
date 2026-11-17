import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Coins,
  FileCheck,
} from 'lucide-react';

export const SchemesShowcaseSection = () => {
  const schemes = [
    {
      code: 'SCHEME-CGTMSE-CGS-I',
      name: 'Credit Guarantee Scheme for Micro & Small Enterprises (CGS-I)',
      authority: 'Ministry of MSME & SIDBI',
      instrument: 'CREDIT_GUARANTEE',
      statutoryDate: 'Effective 1 April 2025 (Official Scheme Doc)',
      benefitSummary: 'Guarantee Coverage up to ₹5.00 Crore (75%–85% Tiered)',
      highlights: [
        'Facility ceiling: ₹5.00 Cr (Scheduled Commercial Banks & NBFCs)',
        'Coverage: 85% for Micro up to ₹5L; 75% for general MSEs; 85% for Women & SC/ST',
        'Retail trade credit ceiling capped at ₹2.00 Crore',
      ],
      officialUrl: 'https://www.cgtmse.in',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    {
      code: 'SCHEME-PLI-AUTO-2021',
      name: 'PLI Scheme for Automobile and Auto Component Industry',
      authority: 'Ministry of Heavy Industries (MHI)',
      instrument: 'PRODUCTION_LINKED_INCENTIVE',
      statutoryDate: 'Incentive Applicability: FY 2022–23 to FY 2026–27',
      benefitSummary: '8% to 18% Incremental Sales Turnover Subsidy',
      highlights: [
        '5-Year Incentive applicability window (disbursements through FY 2027–28)',
        'Champion OEM & Champion Component target segments',
        'Advanced Automotive Technology (AAT) certification required',
      ],
      officialUrl: 'https://heavyindustries.gov.in',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      code: 'SCHEME-PMKSY-CEFPPC',
      name: 'Creation / Expansion of Food Processing Capacities (CEFPPC)',
      authority: 'Ministry of Food Processing Industries (MoFPI)',
      instrument: 'CAPITAL_SUBSIDY',
      statutoryDate: 'Pradhan Mantri Kisan SAMPADA Yojana Guidelines',
      benefitSummary: '35% to 50% Capital Grant on Plant & Machinery',
      highlights: [
        '35% of eligible project cost in General areas (max ₹5.00 Cr)',
        '50% grant in North Eastern States, Himalayan states & ITDP areas',
        'Requires minimum 50% term loan from scheduled banks',
      ],
      officialUrl: 'https://mofpi.gov.in',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    {
      code: 'SCHEME-PM-KUSUM-A',
      name: 'PM-KUSUM Component A: Decentralized Solar Power',
      authority: 'Ministry of New and Renewable Energy (MNRE)',
      instrument: 'TARIFF_FEED_IN_SUPPORT',
      statutoryDate: 'Grid-Connected Solar Power Framework',
      benefitSummary: 'Feed-in Tariff PPA with State DISCOMs for 25 Years',
      highlights: [
        '500 kW to 2 MW decentralized projects on rural or barren land',
        'Pre-fixed levelized feed-in tariff guaranteed by State DISCOM',
        'Option for developer leasing with guaranteed farmer revenue',
      ],
      officialUrl: 'https://mnre.gov.in',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
  ];

  return (
    <section id="schemes" className="py-16 bg-brand-cream/50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <Coins className="h-3.5 w-3.5 text-brand-deep-sage" />
            National Financial Incentives
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            Government Schemes & Statutory Subsidies Engine
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            BizPermit evaluates enterprise eligibility against authoritative Central ministerial guidelines. Generate standardized self-attestation dossiers ready for external portal submission.
          </p>
        </div>

        {/* Schemes 2x2 Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {schemes.map((s) => (
            <div
              key={s.code}
              className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-brand-sage/60 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {s.code}
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase font-bold px-2.5 py-0.5 rounded border ${s.tagColor}`}
                  >
                    {s.instrument.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-brand-charcoal mb-1">
                  {s.name}
                </h3>
                <div className="text-xs text-stone-500 mb-2">{s.authority}</div>

                <div className="p-2.5 rounded-lg bg-brand-pale-sage/30 border border-brand-sage/30 text-xs text-brand-deep-sage font-bold font-mono mb-4 flex items-center justify-between">
                  <span>{s.benefitSummary}</span>
                </div>

                <div className="text-[10px] text-stone-400 font-mono mb-3">
                  {s.statutoryDate}
                </div>

                {/* Highlights */}
                <div className="space-y-1.5 pt-3 border-t border-stone-100 mb-6">
                  {s.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-stone-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <a
                  href={s.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-stone-500 hover:text-brand-deep-sage flex items-center gap-1 transition-colors"
                >
                  <span>Official Ministry Guidelines</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <Link to="/schemes">
                  <button className="py-1.5 px-3 rounded-lg bg-brand-deep-sage hover:bg-[#283b31] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors">
                    <span>Evaluate Eligibility</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Global CTA Strip */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-brand-charcoal">
              Need personalized scheme recommendations for your business?
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Run your enterprise balance sheet and capex investments through our deterministic eligibility matcher.
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/schemes/recommendations">
              <button className="px-4 py-2 rounded-lg bg-brand-amber text-brand-charcoal font-bold text-xs shadow-sm hover:bg-[#c27616] transition-colors flex items-center gap-1.5">
                <span>View Recommendations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
            <Link to="/schemes">
              <button className="px-4 py-2 rounded-lg border border-brand-deep-sage text-brand-deep-sage font-semibold text-xs hover:bg-brand-pale-sage/20 transition-colors">
                Browse Full Catalogue
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
