import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  ShieldAlert,
  Save,
  CheckCircle2
} from 'lucide-react';
import { adminSchemeAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';

const ALLOWED_CRITERION_TYPES = [
  { value: 'STATE_MATCH', label: 'State Location Match (e.g. IN-GJ, IN-MH)' },
  { value: 'TALUKA_CATEGORY', label: 'Taluka / Area Classification (e.g. Category 1, 2, 3)' },
  { value: 'ENTERPRISE_SIZE', label: 'Enterprise Size (MICRO, SMALL, MEDIUM)' },
  { value: 'MSME_REGISTRATION', label: 'Udyam MSME Registration Exists' },
  { value: 'DCOP_DATE', label: 'Date of Commercial Production (DCOP)' },
  { value: 'CAPEX_AMOUNT', label: 'Capital Investment / Plant & Machinery' },
  { value: 'REQUIRED_APPROVALS', label: 'Required Statutory Clearance (e.g. GPCB_CTE)' },
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

export const AdminSchemeCreatePage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [form, setForm] = useState({
    scheme_code: '',
    name: '',
    short_name: '',
    description: '',
    authority_level: 'STATE',
    state_code: 'IN-GJ',
    department_code: 'IND',
    nodal_ministry: '',
    implementing_agency: '',
    financial_instrument_type: 'CAPITAL_SUBSIDY',
    scheme_rule_version: '1.0',
    statutory_reference: {
      notification_number: '',
      guidelines_title: '',
      source_url: '',
      issuing_authority: ''
    },
    declarative_rules: [
      {
        criterion_id: 'rule_state',
        criterion_type: 'STATE_MATCH',
        operator: 'EQ',
        value: 'IN-GJ',
        required_evidence: 'LOCATION_PROFILE',
        label: 'Business facility must be located in the specified state'
      }
    ]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRefChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      statutory_reference: {
        ...prev.statutory_reference,
        [name]: value
      }
    }));
  };

  const handleAddRule = () => {
    const newRule = {
      criterion_id: `rule_${form.declarative_rules.length + 1}`,
      criterion_type: 'ENTERPRISE_SIZE',
      operator: 'IN',
      value: ['MICRO', 'SMALL'],
      required_evidence: 'UDYAM_CERTIFICATE',
      label: 'Qualifying enterprise scale'
    };
    setForm((prev) => ({
      ...prev,
      declarative_rules: [...prev.declarative_rules, newRule]
    }));
  };

  const handleRemoveRule = (index) => {
    setForm((prev) => ({
      ...prev,
      declarative_rules: prev.declarative_rules.filter((_, i) => i !== index)
    }));
  };

  const handleRuleChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.declarative_rules];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, declarative_rules: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Parse value if comma separated for IN / NOT_IN
    const processedRules = form.declarative_rules.map((r) => {
      let val = r.value;
      if (['IN', 'NOT_IN'].includes(r.operator) && typeof val === 'string') {
        val = val.split(',').map((s) => s.trim().toUpperCase());
      } else if (['GTE', 'LTE'].includes(r.operator) && typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) val = num;
      }
      return { ...r, value: val };
    });

    const payload = {
      ...form,
      declarative_rules: processedRules,
      benefits_structure: {
        scheme_summary: form.description
      }
    };

    try {
      await adminSchemeAPI.create(payload);
      navigate('/admin/schemes');
    } catch (err) {
      console.error('Error creating scheme:', err);
      setError(err.response?.data?.error?.message || 'Failed to create scheme. Verify required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/schemes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-brand-deep-sage transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Schemes Governance</span>
        </Link>
        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          SUPER_ADMIN ACCESS
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-amber" />
          Register New Government Scheme
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Add an authoritative Central or State scheme with declarative deterministic eligibility rules. Newly created schemes start in DRAFT / UNVERIFIED state.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Scheme Identification */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-brand-charcoal border-b border-stone-100 pb-2">
            1. Master Scheme Identification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Scheme Code *
              </label>
              <input
                type="text"
                name="scheme_code"
                placeholder="e.g. IN-KA-POLICY-2026"
                value={form.scheme_code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Short Name *
              </label>
              <input
                type="text"
                name="short_name"
                placeholder="e.g. Karnataka MSME Policy 2026"
                value={form.short_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Full Scheme Title *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Comprehensive Industrial & MSME Promotion Scheme of Karnataka 2026"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Statutory Description *
              </label>
              <textarea
                name="description"
                rows="3"
                placeholder="Provide complete statutory scope, target beneficiaries, and assistance objectives..."
                value={form.description}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Authority Level *
              </label>
              <select
                name="authority_level"
                value={form.authority_level}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              >
                <option value="STATE">STATE</option>
                <option value="CENTRAL">CENTRAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                State Code *
              </label>
              <input
                type="text"
                name="state_code"
                placeholder="e.g. IN-GJ, IN-MH, IN-KA, IN-ALL"
                value={form.state_code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Financial Instrument Classification *
              </label>
              <select
                name="financial_instrument_type"
                value={form.financial_instrument_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-purple-800 bg-purple-50/50 focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              >
                <option value="CAPITAL_SUBSIDY">CAPITAL_SUBSIDY (Direct grant)</option>
                <option value="CREDIT_GUARANTEE">CREDIT_GUARANTEE (Third-party risk coverage to lenders)</option>
                <option value="PRODUCTION_LINKED_INCENTIVE">PRODUCTION_LINKED_INCENTIVE (PLI)</option>
                <option value="INFRASTRUCTURE_ASSISTANCE">INFRASTRUCTURE_ASSISTANCE (Power/Water/Common Facilities)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Initial Rule Version
              </label>
              <input
                type="text"
                name="scheme_rule_version"
                value={form.scheme_rule_version}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Statutory Reference & Source Evidence */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-brand-charcoal border-b border-stone-100 pb-2">
            2. Statutory Legal Reference & Source Evidence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Notification / GR Number *
              </label>
              <input
                type="text"
                name="notification_number"
                placeholder="e.g. G.O. Ms. No. 12/2026"
                value={form.statutory_reference.notification_number}
                onChange={handleRefChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Official Guidelines Title *
              </label>
              <input
                type="text"
                name="guidelines_title"
                placeholder="e.g. Operational Guidelines for Capital Subsidy"
                value={form.statutory_reference.guidelines_title}
                onChange={handleRefChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Issuing Department / Ministry
              </label>
              <input
                type="text"
                name="issuing_authority"
                placeholder="e.g. Directorate of Industries & Commerce"
                value={form.statutory_reference.issuing_authority}
                onChange={handleRefChange}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Official Portal / PDF Source URL *
              </label>
              <input
                type="url"
                name="source_url"
                placeholder="https://official-department.gov.in"
                value={form.statutory_reference.source_url}
                onChange={handleRefChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Declarative Eligibility Rules Builder */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-brand-charcoal">
                3. Declarative Eligibility Rules (Allowlisted Engine)
              </h2>
              <p className="text-[11px] text-stone-500">
                Rules are evaluated deterministically. Missing profile fields return MISSING_EVIDENCE. No arbitrary code execution.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddRule}
              className="text-xs flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add Criterion</span>
            </Button>
          </div>

          <div className="space-y-3">
            {form.declarative_rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/70 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-stone-700 text-[11px]">
                    Criterion #{idx + 1}: {rule.criterion_id}
                  </span>
                  {form.declarative_rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-stone-400 hover:text-rose-600 transition-colors"
                      title="Remove Criterion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                      Criterion Type *
                    </label>
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
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                      Operator *
                    </label>
                    <select
                      value={rule.operator}
                      onChange={(e) => handleRuleChange(idx, 'operator', e.target.value)}
                      className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                    >
                      {ALLOWED_OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.value} ({o.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                      Required Value * (comma-separated for IN)
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
                      onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                      className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                      Label / Explanation
                    </label>
                    <input
                      type="text"
                      value={rule.label || ''}
                      onChange={(e) => handleRuleChange(idx, 'label', e.target.value)}
                      placeholder="e.g. Unit must have valid Udyam certificate"
                      className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                      Required Evidence Document
                    </label>
                    <input
                      type="text"
                      value={rule.required_evidence || ''}
                      onChange={(e) => handleRuleChange(idx, 'required_evidence', e.target.value)}
                      placeholder="e.g. UDYAM_CERTIFICATE"
                      className="w-full p-1.5 rounded border border-stone-300 bg-white text-[11px] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/schemes')}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs flex items-center gap-1.5 px-5"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Registering Scheme...' : 'Save & Register Scheme'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};