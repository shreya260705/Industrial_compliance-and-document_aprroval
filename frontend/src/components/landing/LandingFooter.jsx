import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, MapPin, Building2, Lock, ArrowUp } from 'lucide-react';

export const LandingFooter = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-brand-charcoal text-stone-300 text-xs border-t border-stone-800">
      {/* Upper Navigation Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Col 1: Brand & National Purpose (2 cols on md) */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-deep-sage flex items-center justify-center text-white font-bold text-base shadow-sm border border-brand-sage/40">
                BP
              </div>
              <div>
                <span className="text-lg font-bold text-white tracking-tight">BIZPERMIT</span>
                <div className="text-[10px] text-brand-sage font-mono uppercase tracking-wider">
                  National Compliance Workspace
                </div>
              </div>
            </div>

            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              Unified industrial approvals discovery, multi-location business management, encrypted document vault, and statutory obligation monitoring covering 28 States and 8 Union Territories.
            </p>

            <div className="pt-2 flex items-center gap-3 text-stone-400 text-[11px] font-mono">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SIH26130 Active Prototype</span>
              </span>
              <span>•</span>
              <span>ISO 3166-2:IN Grid</span>
            </div>
          </div>

          {/* Col 2: Regulatory Discovery */}
          <div className="space-y-3">
            <h4 className="text-white font-bold font-mono text-[11px] uppercase tracking-wider">
              Statutory Discovery
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/kya" className="hover:text-brand-sage transition-colors">
                  Know Your Approvals (KYA)
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-brand-sage transition-colors">
                  Master Approval Catalogue
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-brand-sage transition-colors">
                  Department Directory
                </Link>
              </li>
              <li>
                <Link to="/jurisdictions" className="hover:text-brand-sage transition-colors">
                  36 States & UTs Explorer
                </Link>
              </li>
              <li>
                <a href="#sectors" className="hover:text-brand-sage transition-colors">
                  Industrial Sectors Grid
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Enterprise Operations */}
          <div className="space-y-3">
            <h4 className="text-white font-bold font-mono text-[11px] uppercase tracking-wider">
              Enterprise Operations
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/facilities" className="hover:text-brand-sage transition-colors">
                  Business & Location Management
                </Link>
              </li>
              <li>
                <Link to="/vault" className="hover:text-brand-sage transition-colors">
                  Secure Document Vault
                </Link>
              </li>
              <li>
                <Link to="/applications" className="hover:text-brand-sage transition-colors">
                  Application Tracking
                </Link>
              </li>
              <li>
                <Link to="/compliance/calendar" className="hover:text-brand-sage transition-colors">
                  Compliance Calendar
                </Link>
              </li>
              <li>
                <Link to="/compliance/renewals" className="hover:text-brand-sage transition-colors">
                  Renewals Radar
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Incentives & Oversight */}
          <div className="space-y-3">
            <h4 className="text-white font-bold font-mono text-[11px] uppercase tracking-wider">
              Incentives & Governance
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/schemes" className="hover:text-brand-sage transition-colors">
                  Government Schemes
                </Link>
              </li>
              <li>
                <Link to="/schemes/recommendations" className="hover:text-brand-sage transition-colors">
                  Scheme Recommendations
                </Link>
              </li>
              <li>
                <Link to="/grievances" className="hover:text-brand-sage transition-colors">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link to="/officer/queue" className="hover:text-brand-sage transition-colors">
                  Officer Scrutiny Queue
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-sage transition-colors">
                  Quick Demo Role Switcher
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Official Facilitation Links Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-stone-400 text-[11px]">
          <div>
            <span className="font-semibold text-stone-300">Reference Portals:</span>{' '}
            <a
              href="https://www.nsws.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white underline ml-1 inline-flex items-center gap-0.5"
            >
              National Single Window System (NSWS) <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {' • '}
            <a
              href="https://indiainvestmentgrid.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white underline inline-flex items-center gap-0.5"
            >
              India Investment Grid (IIG) <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {' • '}
            <a
              href="https://cpcb.nic.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white underline inline-flex items-center gap-0.5"
            >
              Central Pollution Control Board (CPCB) <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-stone-400 hover:text-white self-start md:self-auto transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Legal Notice Bar */}
      <div className="bg-[#242c27] py-4 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-stone-400">
          <div>
            © 2026 BizPermit. All rights reserved. Problem Statement SIH26130 • Independent Statutory Prototype.
          </div>
          <div className="text-stone-400">
            BizPermit is not a statutory body and does not issue licenses. Statutory applications must be filed with competent authorities.
          </div>
        </div>
      </div>
    </footer>
  );
};
