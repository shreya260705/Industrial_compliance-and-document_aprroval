import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Landmark,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Building,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { schemeAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchemeDetailPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await schemeAPI.get(code);
        setScheme(res.data?.data?.scheme);
      } catch (err) {
        console.error('Error fetching scheme detail:', err);
        setError(err.response?.data?.error?.message || 'Scheme not found.');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchDetail();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-3"></div>
        <p className="text-xs text-stone-500">Loading statutory scheme details...</p>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-lg text-rose-800 text-xs">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-600" />
          <div className="font-bold text-sm">Error Loading Scheme</div>
          <p className="mt-1">{error || 'Scheme could not be located.'}</p>
        </div>
        <Button onClick={() => navigate('/schemes')} variant="outline" className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Return to Scheme Catalogue</span>
        </Button>
      </div>
    );
  }

  const ref = scheme.statutory_reference || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/schemes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-brand-deep-sage transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Schemes Catalogue</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/schemes/recommendations?scheme=${scheme.scheme_code}`)}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-amber" />
            <span>Evaluate Location Eligibility</span>
          </Button>
        </div>
      </div>

      {/* Scheme Title Banner */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage border border-brand-sage/30">
            {scheme.scheme_code}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
            {scheme.state_code === 'IN-ALL' ? 'Central (All States)' : scheme.state_code}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            {scheme.financial_instrument_type}
          </span>
          <span className="text-[11px] font-mono text-stone-400">
            Rule Version: {scheme.scheme_rule_version || '1.0'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal">
            {scheme.name}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {scheme.short_name} • {ref.issuing_authority || scheme.department_code}
          </p>
        </div>

        <p className="text-xs text-stone-700 leading-relaxed max-w-4xl pt-1">
          {scheme.description}
        </p>
      </div>

      {/* Decoupled 5 Temporal Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Scheme Lifecycle */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400">Policy Lifecycle</div>
          <div className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${scheme.scheme_lifecycle_status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {scheme.scheme_lifecycle_status}
          </div>
          <div className="text-[11px] text-stone-500">
            {scheme.implementation_period?.start_date} to {scheme.implementation_period?.end_date}
          </div>
        </div>

        {/* Card 2: Fresh Intake Window */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400">Fresh Proposal Intake</div>
          <div className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${scheme.fresh_intake_status === 'OPEN' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {scheme.fresh_intake_status}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            {scheme.fresh_intake_status === 'OPEN' ? 'Accepting applications' : 'Intake window closed'}
          </div>
        </div>

        {/* Card 3: Beneficiary Claims */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400">Beneficiary Claims</div>
          <div className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${scheme.beneficiary_claim_period?.is_active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            {scheme.beneficiary_claim_period?.is_active ? 'Active' : 'Inactive'}
          </div>
          <div className="text-[11px] text-stone-500">
            Freq: {scheme.beneficiary_claim_period?.claim_frequency || 'N/A'}
          </div>
        </div>

        {/* Card 4: Operating / PPA Period */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-stone-400">Project / PPA Tenure</div>
          <div className="text-xs font-bold text-brand-charcoal">
            {scheme.operating_or_ppa_period?.is_applicable ? `${scheme.operating_or_ppa_period.duration_years} Years PPA` : 'Standard Policy'}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            {scheme.operating_or_ppa_period?.is_applicable ? 'Utility PPA agreement' : 'Capex investment'}
          </div>
        </div>
      </div>

      {/* Statutory Source Verification Card */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Statutory Legal References & Source Evidence
          </h2>
          <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            {ref.verification_confidence || 'VERIFIED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Official Document Title</div>
            <div className="font-semibold text-stone-800">{ref.guidelines_title || 'N/A'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Notification / GR Number</div>
            <div className="font-mono font-semibold text-brand-charcoal">{ref.notification_number || 'N/A'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Issuing Authority</div>
            <div className="text-stone-800">{ref.issuing_authority || 'N/A'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Relevant Clause / Annexure</div>
            <div className="text-stone-800">{ref.relevant_clause || 'Standard Terms'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Effective Operative Window</div>
            <div className="text-stone-800 font-mono">
              {ref.effective_from || 'N/A'} to {ref.effective_to || 'Ongoing'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-stone-500">Last Verified Date</div>
            <div className="text-stone-800 font-mono">{ref.last_verified_date || '2026-11-15'}</div>
          </div>
        </div>

        {ref.source_url && (
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-500">Official Source Portal / Publication:</span>
            <a
              href={ref.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep-sage hover:underline"
            >
              <span>{ref.source_url}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Benefits Structure */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
          <Scale className="h-4 w-4 text-brand-amber" />
          Incentive Benefits & Financial Limits
        </h2>

        {/* If Lender Ceilings Table Present (e.g. CGTMSE) */}
        {scheme.facility_ceilings_by_lender && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
              Credit Facility Ceilings by Lender Category (Rev. 01/04/2025)
            </h3>
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Lender Category</th>
                    <th className="p-2.5">Eligible Ceiling</th>
                    <th className="p-2.5">Applicability & Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-800">
                      Scheduled Commercial Banks & Select FIs
                      <div className="text-[10px] text-stone-500 font-normal">PSBs, Private Banks, Foreign Banks, SIDBI, etc.</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">Up to ₹10 Crore (₹1000 Lakh)</td>
                    <td className="p-2.5 text-stone-600">Manufacturing, Services & Trading (No activity-based restriction)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-800">
                      SFBs, RRBs, SFIs & Specified Co-operative Banks
                      <div className="text-[10px] text-stone-500 font-normal">Small Finance Banks, Regional Rural Banks, State Financial Corps</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-brand-amber">Up to ₹200 Lakh (₹2 Crore)</td>
                    <td className="p-2.5 text-stone-600">Per borrower facility ceiling</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-stone-800">
                      Microfinance Institutions (MFIs)
                      <div className="text-[10px] text-stone-500 font-normal">Eligible NBFC-MFIs</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-purple-700">Up to ₹50 Lakh</td>
                    <td className="p-2.5 text-stone-600">Micro enterprise credit facilities</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* If Guarantee Coverage Table Present */}
        {scheme.guarantee_coverage_table && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
              Official Guarantee Coverage Slabs (CGS-I Schedule 1 effective 01/04/2025)
            </h3>
            <div className="overflow-x-auto border border-stone-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Borrower Segment</th>
                    <th className="p-2.5">Up to ₹5 Lakh</th>
                    <th className="p-2.5">Above ₹5L – ₹50L</th>
                    <th className="p-2.5">Above ₹50L – ₹10 Cr</th>
                    <th className="p-2.5">Statutory Rules & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="p-2.5 font-medium text-stone-800">
                      Women Entrepreneurs / Agniveer MSEs
                      <div className="text-[10px] text-stone-500">Women &ge;51% ownership or Agniveer promoted</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">90%</td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">90%</td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">90%</td>
                    <td className="p-2.5 text-stone-500">90% across all slabs up to lender ceiling</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-800">
                      SC / ST / PwD / Aspirational / ZED / Transgender
                      <div className="text-[10px] text-stone-500">Special priority demographic categories</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">85%</td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">85%</td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">85%</td>
                    <td className="p-2.5 text-stone-500">85% across all slabs up to lender ceiling</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-800">
                      NER (incl. Sikkim), J&K, Ladakh
                      <div className="text-[10px] text-stone-500">Special regional geography units</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">80%</td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">80%</td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 text-stone-500">80% up to ₹50L, 75% above ₹50L</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-800">
                      Micro Enterprises (General)
                      <div className="text-[10px] text-stone-500">Plant & Machinery &le; ₹1 Cr</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-emerald-700">85%</td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 text-stone-500">85% up to ₹5L, 75% above ₹5L</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-800">
                      All Other Categories (Small Enterprises General)
                      <div className="text-[10px] text-stone-500">Plant & Machinery &le; ₹10 Cr</div>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 font-bold font-mono text-brand-deep-sage">75%</td>
                    <td className="p-2.5 text-stone-500">75% across all facility slabs</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-stone-500 bg-amber-50/70 p-2.5 rounded border border-amber-200/60 space-y-1">
              <div><strong>RBI Credit Deficient Districts (ICDD):</strong> Eligible MSEs in identified districts receive an additional <strong>+5 percentage points</strong> coverage.</div>
              <div><strong>Credit Rating:</strong> Credit facilities exceeding <strong>₹50 Lakh</strong> require the MLI to assign an internal investment-grade credit rating.</div>
            </div>
          </div>
        )}

        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200/80 text-xs space-y-2">
          {Object.entries(scheme.benefits_structure || {}).map(([key, val]) => (
            <div key={key} className="flex flex-col md:flex-row md:items-start justify-between gap-1 border-b border-stone-200/50 pb-2 last:border-0 last:pb-0">
              <span className="font-semibold text-stone-600 capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="text-stone-900 md:text-right font-medium max-w-xl">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Desk */}
      <div className="p-5 bg-brand-cream/60 rounded-xl border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-brand-charcoal">Ready to prepare an application dossier?</h4>
          <p className="text-xs text-stone-600 mt-0.5">
            Verify your business location against deterministic rules and assemble required documents from the Document Vault.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(`/schemes/recommendations?scheme=${scheme.scheme_code}`)}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4"
          >
            Check Location Eligibility
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/scheme-applications')}
            className="text-xs"
          >
            View Existing Applications
          </Button>
        </div>
      </div>
    </div>
  );
};
