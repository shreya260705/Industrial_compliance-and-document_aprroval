import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Landmark,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';
import { schemeAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchemesCataloguePage = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [instrumentType, setInstrumentType] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState('');
  const [freshIntakeStatus, setFreshIntakeStatus] = useState('');

  const fetchSchemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (stateCode) params.state_code = stateCode;
      if (instrumentType) params.financial_instrument_type = instrumentType;
      if (lifecycleStatus) params.scheme_lifecycle_status = lifecycleStatus;
      if (freshIntakeStatus) params.fresh_intake_status = freshIntakeStatus;

      const res = await schemeAPI.list(params);
      setSchemes(res.data?.data?.schemes || []);
    } catch (err) {
      console.error('Error fetching schemes:', err);
      setError(err.response?.data?.error?.message || 'Failed to load government scheme catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [stateCode, instrumentType, lifecycleStatus, freshIntakeStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSchemes();
  };

  const getIntakeBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">Fresh Intake Open</Badge>;
      case 'WINDOW_BASED_OPEN':
        return <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200">Window-Based Open</Badge>;
      case 'CLOSED_AWAITING_NEXT_EOI':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">Closed (Awaiting Next EOI)</Badge>;
      case 'CLOSED_AWAITING_STATE_TENDER':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">DISCOM Tender Dependent</Badge>;
      case 'TRANSITIONAL_LEGACY_ONLY':
        return <Badge variant="warning" className="bg-orange-50 text-orange-700 border-orange-200">Legacy Transition Only</Badge>;
      case 'PERMANENTLY_CLOSED':
        return <Badge variant="danger" className="bg-rose-50 text-rose-700 border-rose-200">Intake Closed</Badge>;
      case 'NEEDS_CONFIRMATION':
      case 'STATUS_UNCONFIRMED':
        return <Badge variant="draft" className="bg-stone-100 text-stone-700 border-stone-300">Needs Confirmation</Badge>;
      default:
        return <Badge variant="draft">{status}</Badge>;
    }
  };

  const getInstrumentBadge = (type) => {
    switch (type) {
      case 'CREDIT_GUARANTEE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Credit Guarantee (Non-Subsidy)</span>;
      case 'CAPITAL_SUBSIDY':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Capital Subsidy</span>;
      case 'INFRASTRUCTURE_ASSISTANCE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">Infrastructure / PPA</span>;
      case 'PRODUCTION_LINKED_INCENTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">Production Linked Incentive</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-amber">
              Phase 6 • Module 1
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-mono">National Catalogue Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
            <Landmark className="h-6 w-6 text-brand-deep-sage" />
            Government Schemes & Incentives Catalogue
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl">
            Authoritative registry of Central and State industrial support programmes, capital subsidies, and credit guarantee frameworks. Evaluated deterministically with verified statutory sources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/schemes/recommendations')}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white flex items-center gap-2 text-xs"
          >
            <Sparkles className="h-4 w-4 text-brand-amber" />
            <span>Check My Facility Eligibility</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/scheme-applications')}
            className="text-xs flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-stone-600" />
            <span>My Application Dossiers</span>
          </Button>
        </div>
      </div>

      {/* Discovery Banner */}
      <div className="bg-gradient-to-r from-brand-deep-sage via-[#2D4036] to-[#25362E] text-white p-5 rounded-xl shadow-sm border border-brand-deep-sage/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-pale-sage text-xs font-mono uppercase font-semibold">
            <ShieldCheck className="h-4 w-4 text-brand-amber" />
            Statutory Rigor & Zero AI Hallucination
          </div>
          <h3 className="text-base font-bold text-white">
            Location-Specific Deterministic Eligibility Engine
          </h3>
          <p className="text-xs text-stone-300 max-w-2xl">
            Eligibility is evaluated per physical industrial location (taluka category, DCOP, investment ceiling, and required NOCs). We never use arbitrary percentage scores or conflate credit guarantees with cash subsidies.
          </p>
        </div>
        <Button
          onClick={() => navigate('/schemes/recommendations')}
          className="bg-brand-amber hover:bg-brand-amber/90 text-brand-charcoal font-bold text-xs shrink-0 flex items-center gap-1.5 shadow"
        >
          <span>Evaluate My Location</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schemes by name, keyword, notification GR number, or department..."
              className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-md text-xs focus:ring-1 focus:ring-brand-deep-sage focus:border-brand-deep-sage outline-none bg-stone-50/50"
            />
          </div>
          <Button type="submit" className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4">
            Search
          </Button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">State / Central</label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand-deep-sage outline-none"
            >
              <option value="">All Jurisdictions (National)</option>
              <option value="IN-ALL">Central Government</option>
              <option value="IN-GJ">Gujarat (IN-GJ)</option>
              <option value="IN-MH">Maharashtra (IN-MH)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Instrument Type</label>
            <select
              value={instrumentType}
              onChange={(e) => setInstrumentType(e.target.value)}
              className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand-deep-sage outline-none"
            >
              <option value="">All Instruments</option>
              <option value="CAPITAL_SUBSIDY">Capital Subsidy</option>
              <option value="CREDIT_GUARANTEE">Credit Guarantee</option>
              <option value="INFRASTRUCTURE_ASSISTANCE">Infrastructure / PPA</option>
              <option value="PRODUCTION_LINKED_INCENTIVE">PLI</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Fresh Intake Window</label>
            <select
              value={freshIntakeStatus}
              onChange={(e) => setFreshIntakeStatus(e.target.value)}
              className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand-deep-sage outline-none"
            >
              <option value="">All Intake Statuses</option>
              <option value="OPEN">Open for Applications</option>
              <option value="WINDOW_BASED_OPEN">Window-Based Open</option>
              <option value="CLOSED_AWAITING_NEXT_EOI">Closed (Awaiting Next EOI)</option>
              <option value="CLOSED_AWAITING_STATE_TENDER">State Tender Dependent</option>
              <option value="TRANSITIONAL_LEGACY_ONLY">Transitional Legacy Only</option>
              <option value="PERMANENTLY_CLOSED">Permanently Closed</option>
              <option value="NEEDS_CONFIRMATION">Needs Confirmation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Policy Lifecycle</label>
            <select
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value)}
              className="w-full border border-stone-200 rounded px-2.5 py-1.5 text-xs bg-white focus:border-brand-deep-sage outline-none"
            >
              <option value="">All Lifecycles</option>
              <option value="ACTIVE">Active Policy</option>
              <option value="SUPERSEDED">Superseded Policy</option>
              <option value="SUNSET">Sunset Scheme</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-3"></div>
          <p className="text-xs text-stone-500">Loading statutory schemes catalogue...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg text-rose-700 text-xs">
          {error}
        </div>
      ) : schemes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-stone-200">
          <Info className="h-8 w-8 text-stone-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-700">No matching schemes found</h4>
          <p className="text-xs text-stone-500 mt-1">Try resetting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schemes.map((scheme) => (
            <Card key={scheme.scheme_code} className="flex flex-col justify-between hover:shadow-md transition-shadow border-stone-200">
              <div className="p-5 space-y-3">
                {/* Header Tags */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage">
                      {scheme.scheme_code}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      {scheme.state_code === 'IN-ALL' ? 'Central' : scheme.state_code}
                    </span>
                  </div>
                  {getIntakeBadge(scheme.fresh_intake_status)}
                </div>

                {/* Scheme Title */}
                <div>
                  <h3 className="font-bold text-sm text-brand-charcoal line-clamp-2 hover:text-brand-deep-sage">
                    <Link to={`/schemes/${scheme.scheme_code}`}>
                      {scheme.name}
                    </Link>
                  </h3>
                  <div className="text-[11px] text-stone-500 mt-0.5 font-medium">
                    {scheme.short_name}
                  </div>
                </div>

                {/* Instrument Badge */}
                <div>
                  {getInstrumentBadge(scheme.financial_instrument_type)}
                </div>

                {/* Description snippet */}
                <p className="text-xs text-stone-600 line-clamp-3">
                  {scheme.description}
                </p>

                {/* Statutory Reference Card */}
                {scheme.statutory_reference && (
                  <div className="bg-brand-cream/40 p-2.5 rounded border border-stone-200/70 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-stone-500 font-mono text-[10px]">
                      <span>Ref: {scheme.statutory_reference.notification_number || 'N/A'}</span>
                      {scheme.statutory_reference.verification_confidence === 'VERIFIED' && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="text-stone-700 font-medium truncate">
                      {scheme.statutory_reference.issuing_authority || 'Nodal Ministry'}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-stone-50/60 border-t border-stone-100 flex items-center justify-between">
                <Link
                  to={`/schemes/${scheme.scheme_code}`}
                  className="text-xs font-semibold text-brand-deep-sage hover:text-brand-deep-sage/80 flex items-center gap-1"
                >
                  <span>Rules & Sources</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>

                {scheme.fresh_intake_status === 'OPEN' ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/schemes/recommendations?scheme=${scheme.scheme_code}`)}
                    className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-[11px] py-1 px-2.5"
                  >
                    Check Eligibility
                  </Button>
                ) : (
                  <span className="text-[11px] text-stone-400 font-mono">
                    {scheme.fresh_intake_status === 'PERMANENTLY_CLOSED' ? 'Closed' : 'Reference Only'}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Prototype Statutory Disclaimer */}
      <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-3">
        <Info className="h-4 w-4 text-brand-amber shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold">BizPermit SIH26130 Prototype Advisory Notice</div>
          <p className="text-amber-800">
            BizPermit is a digital workspace prototype and preparation assistant. It does not possess delegated statutory authority to award subsidies, issue credit guarantees, or process state disbursements. Official filings must be concluded on the respective Government portals.
          </p>
        </div>
      </div>
    </div>
  );
};
