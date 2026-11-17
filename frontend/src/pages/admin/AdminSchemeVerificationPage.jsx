import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Power,
  AlertTriangle,
  History,
  FileCheck
} from 'lucide-react';
import { adminSchemeAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const AdminSchemeVerificationPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Verification Form
  const [verifyDecision, setVerifyDecision] = useState('VERIFIED');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifiedUrl, setVerifiedUrl] = useState('');

  // Activation Form
  const [selectedVersion, setSelectedVersion] = useState('');
  const [freshIntakeStatus, setFreshIntakeStatus] = useState('OPEN');

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminSchemeAPI.get(code);
      const s = res.data?.data?.scheme;
      setScheme(s);
      setVerifiedUrl(s.statutory_reference?.source_url || '');
      setSelectedVersion(s.active_rule_version || s.scheme_rule_version || '1.0');
    } catch (err) {
      console.error('Error fetching scheme:', err);
      setError(err.response?.data?.error?.message || 'Failed to load scheme.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) fetchDetail();
  }, [code]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setMessage(null);
    setError(null);
    try {
      await adminSchemeAPI.verify(code, {
        decision: verifyDecision,
        notes: verifyNotes,
        verified_source_url: verifiedUrl
      });
      setMessage(`Scheme statutory evidence has been marked as ${verifyDecision}.`);
      setVerifyNotes('');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record verification decision.');
    } finally {
      setVerifying(false);
    }
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    setActivating(true);
    setMessage(null);
    setError(null);
    try {
      await adminSchemeAPI.activate(code, {
        version: selectedVersion,
        fresh_intake_status: freshIntakeStatus
      });
      setMessage(`Rule version ${selectedVersion} activated successfully with intake status ${freshIntakeStatus}.`);
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to activate rule version.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-stone-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-2"></div>
        Loading evidence verification desk...
      </div>
    );
  }

  const ref = scheme?.statutory_reference || {};
  const isVerified = scheme?.verification_status === 'VERIFIED';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/schemes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-brand-deep-sage transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Schemes Governance</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/schemes/${code}/edit`)}
            className="text-xs"
          >
            Edit Scheme & Rules
          </Button>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage border border-brand-sage/30">
            {scheme?.scheme_code}
          </span>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
              isVerified
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            Verification Status: {scheme?.verification_status || 'UNVERIFIED'}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
            Active Version: v{scheme?.active_rule_version || scheme?.scheme_rule_version || '1.0'}
          </span>
        </div>

        <h1 className="text-xl font-bold text-brand-charcoal flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          Statutory Evidence Verification Desk
        </h1>
        <p className="text-xs text-stone-500">
          Independent audit gate: scrutinize official government gazette references, guidelines URLs, and departmental orders before authorizing scheme activation.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Evidence Inspection Card */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-brand-charcoal border-b border-stone-100 pb-2 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-brand-deep-sage" />
          Government Source Evidence Submitted for Scrutiny
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-stone-500">Document Title</span>
            <span className="font-semibold text-stone-800">{ref.guidelines_title || 'N/A'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-stone-500">Notification / Order Number</span>
            <span className="font-mono font-semibold text-brand-charcoal">{ref.notification_number || 'N/A'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-stone-500">Issuing Authority</span>
            <span className="text-stone-800">{ref.issuing_authority || 'N/A'}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-stone-500">Last Verified Date</span>
            <span className="font-mono text-stone-700">{ref.last_verified_date || 'N/A'}</span>
          </div>

          {ref.source_url && (
            <div className="md:col-span-2 pt-2 border-t border-stone-100">
              <span className="block text-[11px] font-semibold text-stone-500 mb-1">
                Official Department / Trust Source URL
              </span>
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
      </div>

      {/* Decision Form */}
      <form onSubmit={handleVerifySubmit} className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-brand-charcoal border-b border-stone-100 pb-2">
          Record Formal Verification Decision
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Decision *</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  value="VERIFIED"
                  checked={verifyDecision === 'VERIFIED'}
                  onChange={() => setVerifyDecision('VERIFIED')}
                  className="text-brand-deep-sage"
                />
                <span className="font-bold text-emerald-800">VERIFIED (Source Authenticated)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  value="REJECTED"
                  checked={verifyDecision === 'REJECTED'}
                  onChange={() => setVerifyDecision('REJECTED')}
                  className="text-rose-600"
                />
                <span className="font-bold text-rose-800">REJECTED (Insufficient Evidence)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Confirmed / Corrected Source URL
            </label>
            <input
              type="url"
              value={verifiedUrl}
              onChange={(e) => setVerifiedUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Audit Scrutiny Notes *
            </label>
            <textarea
              rows="3"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="Record exact verification checks performed against the official gazette / departmental portal..."
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>

          <div className="text-right pt-2">
            <Button
              type="submit"
              disabled={verifying}
              className={`text-xs ${
                verifyDecision === 'VERIFIED'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              } text-white px-5`}
            >
              {verifying ? 'Recording...' : `Record ${verifyDecision} Decision`}
            </Button>
          </div>
        </div>
      </form>

      {/* Activation Desk (Only enabled when VERIFIED) */}
      <form onSubmit={handleActivateSubmit} className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-2">
          <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <Power className="h-4 w-4 text-brand-deep-sage" />
            Activate Verified Rule Version for Industrial Users
          </h2>
          <p className="text-[11px] text-stone-500">
            Activation invalidates obsolete evaluations and publishes the verified rules to the National Catalogue.
          </p>
        </div>

        {!isVerified && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Activation is locked until statutory source evidence is verified above.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rule Version to Activate</label>
            <input
              type="text"
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={!isVerified}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 font-mono text-xs focus:outline-none disabled:bg-stone-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Fresh Proposal Intake Window</label>
            <select
              value={freshIntakeStatus}
              onChange={(e) => setFreshIntakeStatus(e.target.value)}
              disabled={!isVerified}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 font-semibold text-xs focus:outline-none disabled:bg-stone-100"
            >
              <option value="OPEN">OPEN (Accepting New Applications)</option>
              <option value="CLOSED_AWAITING_NEXT_EOI">CLOSED_AWAITING_NEXT_EOI</option>
              <option value="CLOSED_AWAITING_STATE_TENDER">CLOSED_AWAITING_STATE_TENDER</option>
              <option value="TRANSITIONAL_LEGACY_ONLY">TRANSITIONAL_LEGACY_ONLY</option>
              <option value="PERMANENTLY_CLOSED">PERMANENTLY_CLOSED</option>
              <option value="NEEDS_CONFIRMATION">NEEDS_CONFIRMATION</option>
            </select>
          </div>
        </div>

        <div className="text-right pt-2">
          <Button
            type="submit"
            disabled={!isVerified || activating}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-5"
          >
            {activating ? 'Activating...' : 'Activate Verified Version'}
          </Button>
        </div>
      </form>
    </div>
  );
};