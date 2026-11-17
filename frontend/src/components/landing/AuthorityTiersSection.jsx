import React from 'react';
import { Landmark, Layers, MapPin, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AuthorityTiersSection = () => {
  const tiers = [
    {
      level: 'TIER 1',
      title: 'Central Regulatory Authorities',
      tagline: 'Union Government Frameworks',
      badgeColor: 'bg-brand-deep-sage text-white',
      authorities: [
        {
          name: 'MoEFCC',
          fullName: 'Ministry of Environment, Forest & Climate Change',
          domain: 'Prior Environmental Clearance (EIA 2006 Notification), Category A & B1 Scrutiny',
        },
        {
          name: 'CPCB',
          fullName: 'Central Pollution Control Board',
          domain: 'National Industrial Categorization (Red/Orange/Green/White), EPR Portal for Battery & E-Waste',
        },
        {
          name: 'PESO',
          fullName: 'Petroleum and Explosives Safety Organisation',
          domain: 'Bulk Storage Licenses under Petroleum Rules 2002, Gas Cylinders & MSIHC Regulations',
        },
        {
          name: 'CEA & CGWA',
          fullName: 'Central Electricity Authority & Central Ground Water',
          domain: 'High-Tension Grid Interconnection Sanction & Industrial Groundwater Extraction NOC',
        },
      ],
      footnote: 'Applies uniformly across all 28 States and 8 Union Territories.',
    },
    {
      level: 'TIER 2',
      title: 'State Line Departments',
      tagline: 'State Government Administration',
      badgeColor: 'bg-brand-walnut text-white',
      authorities: [
        {
          name: 'SPCB / PCC',
          fullName: 'State Pollution Control Boards (GPCB, MPCB, TNPCB, etc.)',
          domain: 'Consent to Establish (CTE) & Consent to Operate (CTO) under Water Act 1974 & Air Act 1981',
        },
        {
          name: 'DISH',
          fullName: 'Directorate of Industrial Safety & Health',
          domain: 'Factory Building Plan Approval, Factory License under Factories Act 1948 & Indian Boilers Act',
        },
        {
          name: 'Fire Directorate',
          fullName: 'State Fire Prevention & Life Safety Services',
          domain: 'Provisional & Final Fire Safety NOC, Hydrant & Sprinkler Design Sanction',
        },
        {
          name: 'Labour Commissioner',
          fullName: 'State Labour Commissionerate',
          domain: 'Contract Labour Registration, Building & Other Construction Workers (BOCW) Cess',
        },
      ],
      footnote: 'Enforced via State Single Window Facilitation Systems (IFP, MAITRI, Guidance TN).',
    },
    {
      level: 'TIER 3',
      title: 'Local & Industrial Authorities',
      tagline: 'Municipal & Estate Administration',
      badgeColor: 'bg-brand-amber text-brand-charcoal',
      authorities: [
        {
          name: 'State IDCs',
          fullName: 'Industrial Development Corporations (GIDC, MIDC, SIPCOT)',
          domain: 'Industrial Plot Allotment, Water Supply Connection, Drainage Sanction & Construction Permission',
        },
        {
          name: 'Municipal Corp.',
          fullName: 'Urban Local Bodies (AMC, PMC, GCC, etc.)',
          domain: 'Municipal Building Sanction, Local Health Trade License, Solid Waste Disposal Assessment',
        },
        {
          name: 'Revenue & Panchayat',
          fullName: 'District Collectorate & Gram Panchayats',
          domain: 'Non-Agricultural (NA) Land Conversion, Gram Panchayat NOC for Rural Establishment Siting',
        },
      ],
      footnote: 'Site-specific execution governed by municipal and industrial zoning bylaws.',
    },
  ];

  return (
    <section className="py-16 bg-brand-cream/60 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="h-3.5 w-3.5 text-brand-deep-sage" />
            Three-Tier Regulatory Matrix
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            Comprehensive Federal Coverage: Central, State & Local
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            Industrial establishment in India operates across a three-tiered constitutional structure. BizPermit models requirements across all three levels so your compliance team never misses a statutory layer.
          </p>
        </div>

        {/* 3 Tier Columns Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, idx) => (
            <div
              key={idx}
              className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded ${t.badgeColor}`}
                  >
                    {t.level}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400 font-semibold uppercase">
                    {t.tagline}
                  </span>
                </div>

                <h3 className="text-base font-bold text-brand-charcoal mb-4">
                  {t.title}
                </h3>

                {/* Authorities in Tier */}
                <div className="space-y-3.5 mb-6">
                  {t.authorities.map((auth, aIdx) => (
                    <div key={aIdx} className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                      <div className="flex items-center justify-between text-xs font-bold text-brand-deep-sage mb-0.5">
                        <span>{auth.name}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-brand-charcoal mb-1">
                        {auth.fullName}
                      </div>
                      <div className="text-[10px] text-stone-500 leading-relaxed">
                        {auth.domain}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footnote */}
              <div className="pt-3 border-t border-stone-100 text-[10px] text-stone-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{t.footnote}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
