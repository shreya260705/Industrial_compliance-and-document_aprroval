import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Send,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { adminSchemeAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';

const ALLOWED_CRITERION_TYPES = [
  { value: 'STATE_MATCH', label: 'State Location Match (e.g. IN-GJ, IN-MH)' },
  { value: 'TALUKA_CATEGORY', label: 'Taluka / Area Classification' },
  { value: 'ENTERPRISE_SIZE', label: 'Enterprise Size (MICRO, SMALL, MEDIUM)' },
  { value: 'MSME_REGISTRATION', label: 'Udyam MSME Registration Exists' },
  { value: 'DCOP_DATE', label: 'Date of Commercial Production (DCOP)' },
  { value: 'CAPEX_AMOUNT', label: 'Capital Investment / Plant & Machinery' },
  { value: 'REQUIRED_APPROVALS', label: 'Required Statutory Clearance' },
  { value: 'SECTOR_ELIGIBILITY', label: 'Industrial Sector / Activity' },
  { value: 'LENDER_CATEGORY', label: 'Lender Category (For Credit Guarantees)' }
];

const ALLOWED_OPERATORS = [
  { value: 'EQ', label: 'Equal To (==)' },
  { value: 'NEQ', label: 'Not Equal To (!=)' },
  { value: 'IN', label: 'In Allowed List' },
  { value: 'NOT_IN', label: 'Not In List' },
  { value: 'GTE', label: 'Greater Than or Equal (>=)' },
  { value: 'LTE', label: 'Less Than or Equal (<=)' },
  { value: 'BETWEEN', label: 'Between Bounds [min, max]' },
  { value: 'EXISTS', label: 'Field Exists / Not Null' }
];

export const AdminSchemeEditPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submittingMeta, setSubmittingMeta] = useState(false);
  const [submittingRules, setSubmittingRules] = useState(false);
  const [submittingVerifyReq, setSubmittingVerifyReq] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Scheme state
  const [scheme, setScheme] = useState(null);
  const [metaForm, setMetaForm] = useState({
    name: '',
    short_name: '',
    description: '',
    statutory_reference: {
      notification_number: '',
      guidelines_title: '',
      source_url: '',
      issuing_authority: ''
    }
  });

  // New Rule Version Builder
  const [newVersion, setNewVersion] = useState('');
  const [rules, setRules] = useState([
    {
      criterion_id: 'rule_1',
      criterion_type: 'STATE_MATCH',
      operator: 'EQ',
      value: 'IN-GJ',
      required_evidence: 'LOCATION_PROFILE',
      label: 'Location state jurisdiction'
    }
  ]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminSchemeAPI.get(code);
      const s = res.data?.data?.scheme;
      setScheme(s);
      setMetaForm({
        name: s.name || '',
        short_name: s.short_name || '',
        description: s.description || '',
        statutory_reference: {
          notification_number: s.statutory_reference?.notification_number || '',
          guidelines_title: s.statutory_reference?.guidelines_title || '',
          source_url: s.statutory_reference?.source_url || '',
          issuing_authority: s.statutory_reference?.issuing_authority || ''
        }
      });
      setNewVersion(`${s.active_rule_version || s.scheme_rule_version || '1.0'}.1`);
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

  const handleMetaSubmit = async (e) => {
    e.preventDefault();
    setSubmittingMeta(true);
    setMessage(null);
    setError(null);
    try {
      await adminSchemeAPI.update(code, metaForm);
      setMessage('Metadata updated successfully.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update metadata.');
    } finally {
      setSubmittingMeta(false);
    }
  };

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        criterion_id: `rule_${prev.length + 1}`,
        criterion_type: 'ENTERPRISE_SIZE',
        operator: 'IN',
        value: ['MICRO', 'SMALL'],
        required_evidence: 'UDYAM_CERTIFICATE',
        label: 'Eligible enterprise scale'
      }
    ]);
  };

  const handleRemoveRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index, field, value) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateRuleVersion = async (e) => {
    e.preventDefault();
    setSubmittingRules(true);
    setMessage(null);
    setError(null);

    const processedRules = rules.map((r) => {
      let val = r.value;
      if (['IN', 'NOT_IN'].includes(r.operator) && typeof val === 'string') {
        val = val.split(',').map((s) => s.trim().toUpperCase());
      } else if (['GTE', 'LTE'].includes(r.operator) && typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) val = num;
      }
      return { ...r, value: val };
    });

    try {
      await adminSchemeAPI.createRuleVersion(code, {
        version: newVersion,
        rules: processedRules
      });
      setMessage(`Rule version ${newVersion} created successfully.`);
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create rule version.');
    } finally {
      setSubmittingRules(false);
    }
  };

  const handleSubmitForVerification = async () => {
    setSubmittingVerifyReq(true);
    setMessage(null);
    setError(null);
    try {
      await adminSchemeAPI.submitVerification(code, {});
      setMessage('Scheme submitted for formal statutory evidence verification.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit for verification.');
    } finally {
      setSubmittingVerifyReq(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-stone-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-2"></div>
        Loading scheme configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
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
            onClick={() => navigate(`/admin/schemes/${code}/verification`)}
            className="text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Open Verification Desk</span>
          </Button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage border border-brand-sage/30">
            {scheme?.scheme_code}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
            {scheme?.authority_level} • {scheme?.state_code}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            Status: {scheme?.verification_status || 'UNVERIFIED'}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
            Active Version: v{scheme?.active_rule_version || scheme?.scheme_rule_version || '1.0'}
          </span>
        </div>

        <h1 className="text-xl font-bold text-brand-charcoal">{scheme?.name}</h1>
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

      {/* Form 1: Metadata Editor */}
      <form onSubmit={handleMetaSubmit} className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h2 className="text-sm font-bold text-brand-charcoal">1. Scheme Metadata & Statutory Citations</h2>
            <p className="text-[11px] text-stone-500">Edit descriptive details and official government sources.</p>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={submittingMeta}
            className="text-xs bg-brand-deep-sage text-white flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{submittingMeta ? 'Saving...' : 'Save Metadata'}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Scheme Short Name</label>
            <input
              type="text"
              value={metaForm.short_name}
              onChange={(e) => setMetaForm({ ...metaForm, short_name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Full Scheme Name</label>
            <input
              type="text"
              value={metaForm.name}
              onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Description</label>
            <textarea
              rows="3"
              value={metaForm.description}
              onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Notification / GR Number</label>
            <input
              type="text"
              value={metaForm.statutory_reference.notification_number}
              onChange={(e) =>
                setMetaForm({
                  ...metaForm,
                  statutory_reference: {
                    ...metaForm.statutory_reference,
                    notification_number: e.target.value
                  }
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Official Portal URL</label>
            <input
              type="url"
              value={metaForm.statutory_reference.source_url}
              onChange={(e) =>
                setMetaForm({
                  ...metaForm,
                  statutory_reference: {
                    ...metaForm.statutory_reference,
                    source_url: e.target.value
                  }
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none"
            />
          </div>
        </div>
      </form>

      {/* Form 2: Create New Rule Version */}
      <form onSubmit={handleCreateRuleVersion} className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h2 className="text-sm font-bold text-brand-charcoal">2. Append New Declarative Rule Version</h2>
            <p className="text-[11px] text-stone-500">
              Preserves historical versions and appends a newly authored declarative rule set.
            </p>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={submittingRules}
            className="text-xs bg-brand-charcoal text-white flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{submittingRules ? 'Creating...' : 'Create Rule Version'}</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="font-semibold text-stone-600">Version Identifier:</label>
          <input
            type="text"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
            required
            className="px-3 py-1.5 rounded-lg border border-stone-300 font-mono text-xs w-40 focus:outline-none"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddRule}
            className="text-xs ml-auto flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Criterion</span>
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/70 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-stone-700 text-[11px]">
                  Criterion #{idx + 1}: {rule.criterion_id}
                </span>
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Criterion Type</label>
                  <select
                    value={rule.criterion_type}
                    onChange={(e) => handleRuleChange(idx, 'criterion_type', e.target.value)}
                    className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] focus:outline-none"
                  >
                    {ALLOWED_CRITERION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Operator</label>
                  <select
                    value={rule.operator}
                    onChange={(e) => handleRuleChange(idx, 'operator', e.target.value)}
                    className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                  >
                    {ALLOWED_OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Value</label>
                  <input
                    type="text"
                    value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
                    onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                    className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Label / Explanation</label>
                  <input
                    type="text"
                    value={rule.label || ''}
                    onChange={(e) => handleRuleChange(idx, 'label', e.target.value)}
                    className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Required Evidence Document</label>
                  <input
                    type="text"
                    value={rule.required_evidence || ''}
                    onChange={(e) => handleRuleChange(idx, 'required_evidence', e.target.value)}
                    className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>

      {/* Submission for Verification Desk */}
      <div className="p-5 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-amber-900">Statutory Evidence Verification Desk</h4>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Submit newly authored rules and evidence for formal audit sign-off before activation.
          </p>
        </div>

        <Button
          onClick={handleSubmitForVerification}
          disabled={submittingVerifyReq || scheme?.verification_status === 'UNDER_VERIFICATION'}
          className="bg-amber-800 hover:bg-amber-900 text-white text-xs flex items-center gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          <span>
            {scheme?.verification_status === 'UNDER_VERIFICATION'
              ? 'Currently Under Verification'
              : 'Submit for Audit Scrutiny'}
          </span>
        </Button>
      </div>
    </div>
  );
};