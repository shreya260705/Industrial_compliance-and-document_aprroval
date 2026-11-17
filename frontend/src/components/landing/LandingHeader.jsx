import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowRight, Building2, UserCheck } from 'lucide-react';

export const LandingHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-brand-deep-sage flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-[#283b31] transition-colors">
            BP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-brand-deep-sage">
                BIZPERMIT
              </span>
              <span className="hidden sm:inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage font-bold border border-brand-sage/40">
                SIH26130
              </span>
            </div>
            <div className="text-[10px] text-stone-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
              National Industrial Compliance Workspace
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-brand-charcoal">
          <Link to="/catalogue" className="hover:text-brand-deep-sage transition-colors">
            Approvals
          </Link>
          <a href="#coverage" className="hover:text-brand-deep-sage transition-colors">
            36 States & UTs
          </a>
          <a href="#sectors" className="hover:text-brand-deep-sage transition-colors">
            Industrial Sectors
          </a>
          <a href="#how-it-works" className="hover:text-brand-deep-sage transition-colors">
            How It Works
          </a>
          <a href="#schemes" className="hover:text-brand-deep-sage transition-colors">
            Schemes & Incentives
          </a>
          <Link to="/grievances" className="hover:text-brand-deep-sage transition-colors">
            Grievances
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link to="/login">
            <button className="px-3.5 py-2 rounded-lg text-xs font-bold text-brand-charcoal hover:bg-stone-100 transition-colors">
              Sign In
            </button>
          </Link>

          <Link to="/register">
            <button className="px-4 py-2 rounded-lg bg-brand-deep-sage hover:bg-[#283b31] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>Register Enterprise</span>
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center gap-2">
          <Link to="/login">
            <button className="px-3 py-1.5 rounded-md text-xs font-bold text-brand-deep-sage bg-brand-pale-sage/50">
              Sign In
            </button>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-stone-600 hover:text-brand-charcoal hover:bg-stone-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-2.5 text-xs font-semibold text-brand-charcoal">
            <Link
              to="/catalogue"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              Approval Catalogue
            </Link>
            <a
              href="#coverage"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              36 States & UTs Coverage
            </a>
            <a
              href="#sectors"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              Industrial Sectors Grid
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              How It Works
            </a>
            <a
              href="#schemes"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              Schemes & Subsidies
            </a>
            <Link
              to="/grievances"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-50"
            >
              Grievance Redressal
            </Link>
          </nav>

          <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <button className="w-full py-2.5 px-4 rounded-lg bg-brand-deep-sage text-white text-xs font-bold text-center">
                Register Enterprise
              </button>
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <button className="w-full py-2 px-4 rounded-lg border border-stone-200 text-brand-charcoal text-xs font-semibold text-center hover:bg-stone-50">
                Sign In (Demo Switcher)
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
