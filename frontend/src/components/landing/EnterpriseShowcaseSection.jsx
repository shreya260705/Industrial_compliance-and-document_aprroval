import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Users,
} from 'lucide-react';

export const EnterpriseShowcaseSection = () => {
  const showcaseLocations = [
    {
      id: 'gj-sanand',
      name: 'Sanand Heavy Stamping Unit',
      state: 'Gujarat',
      cluster: 'Sanand GIDC Phase II, Ahmedabad',
      cpcbCategory: 'ORANGE CATEGORY',
      connectedLoad: '1,200 HP',
      workforce: '185 Workers',
      status: 'IN FULL COMPLIANCE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      approvals: [
        { name: 'GPCB Consent to Operate (CTO)', validity: 'Valid till Mar 2028' },
        { name: 'DISH Factory License', validity: 'Annual Return Filed' },
        { name: 'GIDC Industrial Water Connection', validity: 'Active Connection' },
      ],
    },
    {
      id: 'tn-hosur',
      name: 'Hosur Manufacturing & Logistics Hub',
      state: 'Tamil Nadu',
      cluster: 'SIPCOT Industrial Complex, Hosur',
      cpcbCategory: 'ORANGE CATEGORY',
      connectedLoad: '850 HP',
      workforce: '120 Workers',
      status: 'RENEWAL DUE (45 DAYS)',
      statusColor: 'bg-amber-100 text-amber-900 border-amber-300',
      approvals: [
        { name: 'TNPCB Consent to Operate (CTO)', validity: 'Renewal window open' },
        { name: 'DISH Tamil Nadu Safety Certificate', validity: 'Valid till Dec 2027' },
        { name: 'SIPCOT Infrastructure NOC', validity: 'Sanctioned' },
      ],
    },
    {
      id: 'mh-chakan',
      name: 'Chakan Tooling & Die Facility',
      state: 'Maharashtra',
      cluster: 'MIDC Phase III, Chakan, Pune',
      cpcbCategory: 'GREEN / ORANGE',
      connectedLoad: '450 HP',
      workforce: '65 Workers',
      status: 'IN FULL COMPLIANCE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      approvals: [
        { name: 'MPCB Air & Water Consent', validity: 'Valid till Nov 2028' },
        { name: 'MH-DISH Factory Sanction', validity: 'Approved Blueprint' },
        { name: 'Pune Fire Services Final NOC', validity: 'Certified' },
      ],
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <Building2 className="h-3.5 w-3.5 text-brand-deep-sage" />
            Multi-Location Business Architecture
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            One Corporate Umbrella. Multi-Location Business Network.
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            Eliminate separate tracking spreadsheets for each state facility. BizPermit enables corporate leadership to maintain a single source of truth across diverse state locations and industrial corridors.
          </p>
        </div>

        {/* Enterprise Demonstration Canvas */}
        <div className="bg-brand-cream/40 border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Top Corporate Summary Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-stone-200 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-deep-sage flex items-center justify-center text-white font-bold text-lg shadow-sm">
                HA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-brand-charcoal">
                    Horizon AutoTech Private Limited
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    Seeded Enterprise
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  CIN: U29304GJ2024PTC148920 • Corporate Headquarters: Ahmedabad, Gujarat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-center min-w-[100px]">
                <div className="text-stone-400 text-[10px] font-bold">TOTAL LOCATIONS</div>
                <div className="text-base font-extrabold text-brand-charcoal">03 Units</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-center min-w-[100px]">
                <div className="text-stone-400 text-[10px] font-bold">COMPLIANCE</div>
                <div className="text-base font-extrabold text-emerald-700">94.8% Health</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-center min-w-[100px]">
                <div className="text-stone-400 text-[10px] font-bold">ACTIVE VAULT</div>
                <div className="text-base font-extrabold text-brand-deep-sage">14 Dossiers</div>
              </div>
            </div>
          </div>

          {/* 3 Business Locations Showcase Grid */}
          <div className="grid md:grid-cols-3 gap-5">
            {showcaseLocations.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-brand-sage/60 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-stone-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-brand-deep-sage" />
                      {p.state}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${p.statusColor}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-brand-charcoal mb-1">
                    {p.name}
                  </h4>
                  <div className="text-[11px] text-stone-500 mb-3">{p.cluster}</div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 mb-4 bg-stone-50 p-2 rounded border border-stone-100">
                    <span>{p.cpcbCategory}</span>
                    <span>•</span>
                    <span>{p.connectedLoad}</span>
                    <span>•</span>
                    <span>{p.workforce}</span>
                  </div>

                  {/* Clearances Status */}
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <div className="text-[10px] font-mono uppercase font-bold text-stone-400">
                      Location Clearances Status:
                    </div>
                    {p.approvals.map((app, aIdx) => (
                      <div key={aIdx} className="text-xs">
                        <div className="font-medium text-brand-charcoal flex items-center justify-between">
                          <span className="line-clamp-1">{app.name}</span>
                          <span className="text-[10px] text-emerald-700 font-mono font-semibold shrink-0">
                            {app.validity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stone-100">
                  <Link to="/facilities">
                    <button className="w-full py-1.5 px-3 rounded-lg bg-stone-50 hover:bg-brand-pale-sage/30 border border-stone-200 text-brand-deep-sage text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                      <span>View Facility Dashboard</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
