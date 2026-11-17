import React from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Pill,
  Utensils,
  FlaskConical,
  Cpu,
  Shirt,
  Sun,
  Wrench,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const IndustrialSectorsSection = () => {
  const sectors = [
    {
      id: 'automotive',
      name: 'Automotive & Auto Components',
      cpcbCategory: 'ORANGE / RED',
      cpcbColor: 'bg-orange-100 text-orange-950 border-orange-300',
      icon: Car,
      iconColor: 'text-brand-deep-sage',
      approvals: ['GPCB/MPCB/TNPCB CTE & CTO', 'DISH Factory License', 'Fire Safety NOC', 'Hazardous Waste Auth'],
      scheme: 'PLI Auto & CGTMSE CGS-I',
      exampleUnits: 'Stamping Units, Paint Booths, Engine Assembly, EV Powertrain',
    },
    {
      id: 'pharma',
      name: 'Pharmaceuticals & Bulk Drugs (APIs)',
      cpcbCategory: 'RED CATEGORY',
      cpcbColor: 'bg-rose-100 text-rose-950 border-rose-300',
      icon: Pill,
      iconColor: 'text-rose-700',
      approvals: ['MoEFCC Environmental Clearance (EIA)', 'Zero Liquid Discharge (ZLD) Sanction', 'PESO Solvent License', 'FDCA Drug License'],
      scheme: 'Bulk Drug Parks & CGTMSE',
      exampleUnits: 'Formulations, API Synthesis, Sterile Injectables, Biotech',
    },
    {
      id: 'food',
      name: 'Food Processing & Agro Industries',
      cpcbCategory: 'ORANGE / GREEN',
      cpcbColor: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: Utensils,
      iconColor: 'text-brand-amber',
      approvals: ['FSSAI Central / State License', 'SPCB Trade Effluent Discharge', 'Indian Boilers Act (IBR) Reg', 'Health Trade License'],
      scheme: 'PMKSY - CEFPPC Capital Subsidy',
      exampleUnits: 'Dairy Processing, Cold Chain, Grain Milling, Ready-to-Eat',
    },
    {
      id: 'chemicals',
      name: 'Chemicals & Petrochemicals',
      cpcbCategory: 'RED CATEGORY',
      cpcbColor: 'bg-rose-100 text-rose-950 border-rose-300',
      icon: FlaskConical,
      iconColor: 'text-rose-700',
      approvals: ['MSIHC Rules 1989 On-Site Plan', 'PESO Class A/B Flammable Storage', 'Hazardous Waste Form 1', 'Factory Act Schedule 1'],
      scheme: 'PCDO Cluster Scheme & CGTMSE',
      exampleUnits: 'Specialty Chemicals, Polymers, Resins, Agrochemicals',
    },
    {
      id: 'electronics',
      name: 'Electronics & Semiconductors',
      cpcbCategory: 'GREEN / ORANGE',
      cpcbColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      icon: Cpu,
      iconColor: 'text-brand-deep-sage',
      approvals: ['E-Waste Management EPR Authorisation', 'RoHS Compliance Sanction', 'Clean Room Air Clearances', 'DISH Electrical Safety'],
      scheme: 'SPECS & Semicon India Program',
      exampleUnits: 'PCB Assembly, Semiconductor Packaging, Display Fabrication',
    },
    {
      id: 'textiles',
      name: 'Textiles, Garments & Dyeing',
      cpcbCategory: 'ORANGE / RED',
      cpcbColor: 'bg-orange-100 text-orange-950 border-orange-300',
      icon: Shirt,
      iconColor: 'text-brand-walnut',
      approvals: ['CETP Membership & SPCB CTO', 'Steam Boiler Registration (IBR)', 'Groundwater Extraction (CGWA)', 'Labour Code Filings'],
      scheme: 'PM MITRA Mega Textile Parks',
      exampleUnits: 'Spinning Mills, Dyeing Units, Garment Export, Technical Fabrics',
    },
    {
      id: 'renewables',
      name: 'Renewable Energy, Batteries & EV',
      cpcbCategory: 'GREEN / WHITE',
      cpcbColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      icon: Sun,
      iconColor: 'text-brand-amber',
      approvals: ['Battery Waste Management EPR', 'CEA Grid Synchronization Certificate', 'Solar Park Land Conversion', 'DISCOM Connectivity'],
      scheme: 'PM-KUSUM Component A & PLI ACC',
      exampleUnits: 'Solar Farm 500kW–2MW, Lithium Battery Pack, EV Charging Hubs',
    },
    {
      id: 'engineering',
      name: 'Heavy Engineering & Fabrication',
      cpcbCategory: 'ORANGE / RED',
      cpcbColor: 'bg-orange-100 text-orange-950 border-orange-300',
      icon: Wrench,
      iconColor: 'text-brand-deep-sage',
      approvals: ['DISH Pressure Vessel & Crane Stability', 'High-Tension Electrical Sanction', 'Air Act Stack Emission Approval', 'Factory Building Sanction'],
      scheme: 'Capital Goods Scheme & ZED Cert',
      exampleUnits: 'Foundries, Forging Presses, Structural Fabrication, Cranes',
    },
  ];

  return (
    <section id="sectors" className="py-16 bg-brand-cream/50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5 text-brand-deep-sage" />
            Sector-Specific Regulatory Mapping
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            Tailored Clearances Across Major Industrial Sectors
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            Industrial compliance in India is sector-dependent. BizPermit models CPCB environmental scoring, hazardous substance thresholds, and ministerial incentives specific to your manufacturing domain.
          </p>
        </div>

        {/* Sectors Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sectors.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-brand-sage/60 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Sector Header with Icon and CPCB Category */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                      <Icon className={`h-5 w-5 ${sec.iconColor}`} />
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${sec.cpcbColor}`}
                    >
                      {sec.cpcbCategory}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-brand-charcoal mb-1 leading-snug">
                    {sec.name}
                  </h3>
                  <div className="text-[10px] text-stone-500 mb-3 font-medium">
                    {sec.exampleUnits}
                  </div>

                  {/* Key Clearances Checklist */}
                  <div className="space-y-1.5 pt-3 border-t border-stone-100 mb-4">
                    <div className="text-[10px] font-mono uppercase font-bold text-stone-400">
                      Key Clearances Required:
                    </div>
                    {sec.approvals.map((app, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{app}</span>
                      </div>
                    ))}
                  </div>

                  {/* Applicable Incentive */}
                  <div className="p-2.5 rounded-lg bg-brand-cream/60 border border-stone-200 text-[11px] text-stone-600 mb-4">
                    <span className="font-semibold text-brand-charcoal">Eligible Scheme:</span>{' '}
                    <span className="text-brand-deep-sage font-medium">{sec.scheme}</span>
                  </div>
                </div>

                {/* Direct CTA */}
                <Link to="/kya" className="block pt-1">
                  <button className="w-full py-2 px-3 rounded-lg bg-stone-50 hover:bg-brand-pale-sage/40 border border-stone-200 text-brand-deep-sage text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                    <span>Evaluate {sec.name.split(' ')[0]} in KYA</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
