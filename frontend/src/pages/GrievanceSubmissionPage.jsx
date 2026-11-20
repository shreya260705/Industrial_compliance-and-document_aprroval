import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { grievancesAPI, facilitiesAPI, documentVaultAPI } from '../services/api';
import {
  ArrowLeft,
  Send,
  AlertCircle,
  FileText,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const GrievanceSubmissionPage = () => {
  const navigate = useNavigate();
  const [track, setTrack] = useState('INTERNAL'); // "INTERNAL" or "EXTERNAL"
  const [categories, setCategories] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [businessId, setBusinessId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departmentCode, setDepartmentCode] = useState('IN-GJ-IND');
  const [stateCode, setStateCode] = useState('IN-GJ');
  const [categoryCode, setCategoryCode] = useState('APP_PROCESSING');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [severity, setSeverity] = useState('MODERATE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVaultDocs, setSelectedVaultDocs] = useState([]);

  // Statutory Citation (Safe Handling)
  const [actOrRule, setActOrRule] = useState('');
  const [sectionClause, setSectionClause] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // Track B External Tracking
  const [authorityName, setAuthorityName] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [externalStatus, setExternalStatus] = useState('SUBMITTED');

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const catRes = await grievancesAPI.categories();
        setCategories(catRes.data?.data?.categories || []);

        const facRes = await facilitiesAPI.list();
        const facList = facRes.data?.data?.locations || facRes.data?.data || [];
        setFacilities(facList);
        if (facList.length > 0) {
          setLocationId(facList[0].id || facList[0]._id);
          setBusinessId(facList[0].business_id);
          if (facList[0].address?.state_code) {
            setStateCode(facList[0].address.state_code);
          }
        }

        const docRes = await documentVaultAPI.list();
        setVaultDocs(docRes.data?.data?.documents || docRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load form prerequisites:', err);
        setError(err.response?.data?.error?.message || err.message || 'Failed to load the required form data.');
      }
    };
    loadPrerequisites();
  }, []);

  const handleFacilityChange = (locId) => {
    setLocationId(locId);
    const selected = facilities.find((f) => (f.id || f._id) === locId);
    if (selected) {
      setBusinessId(selected.business_id);
      if (selected.address?.state_code) {
        setStateCode(selected.address.state_code);
      }
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedVaultDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!businessId) {
      setError('Please select a business facility.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is mandatory.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters).');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        track,
        business_id: businessId,
        location_id: locationId || undefined,
        department_code: departmentCode,
        state_code: stateCode,
        category_code: categoryCode,
        subcategory: subcategory.trim() || undefined,
        priority,
        severity,
        subject: subject.trim(),
        description: description.trim(),
        vault_document_ids: selectedVaultDocs,
      };

      if (actOrRule || sectionClause || sourceUrl) {
        payload.statutory_source_reference = {
          authority_name: departmentCode,
          act_or_rule: actOrRule.trim(),
          section_clause: sectionClause.trim(),
          source_url: sourceUrl.trim(),
          verification_status: 'NEEDS_CONFIRMATION',
        };
      }

      if (track === 'EXTERNAL') {
        payload.external_tracking = {
          authority_name: authorityName.trim(),
          portal_url: portalUrl.trim(),
          external_reference_number: externalReference.trim(),
          applicant_reported_status: externalStatus,
          latest_applicant_update: 'Initial external tracking logged.',
        };
      }

      const res = await grievancesAPI.create(payload);
      const newGrv = res.data?.data?.grievance;
      navigate(`/grievances/${newGrv.id || newGrv._id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to lodge grievance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        to="/grievances"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-brand-deep-sage transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Grievances
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h1 className="text-xl font-bold text-brand-charcoal">Lodge a New Grievance</h1>
        <p className="text-xs text-stone-500 mt-1">
          Select between Track A (BizPermit Internal Administrative Redressal) or Track B (External Statutory Representation Tracking).
        </p>

        {/* Track Switcher */}
        <div className="grid grid-cols-2 gap-3 mt-6 p-1 bg-stone-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTrack('INTERNAL')}
            className={`py-2.5 px-4 rounded-md text-xs font-semibold transition ${
              track === 'INTERNAL'
                ? 'bg-brand-deep-sage text-white shadow-sm'
                : 'text-stone-600 hover:text-brand-charcoal'
            }`}
          >
            Track A: Internal Service Grievance
          </button>
          <button
            type="button"
            onClick={() => setTrack('EXTERNAL')}
            className={`py-2.5 px-4 rounded-md text-xs font-semibold transition ${
              track === 'EXTERNAL'
                ? 'bg-brand-deep-sage text-white shadow-sm'
                : 'text-stone-600 hover:text-brand-charcoal'
            }`}
          >
            Track B: External Government Tracking
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Facility & Location Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Business Location / Facility
              </label>
              <select
                value={locationId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-brand-deep-sage"
              >
                {facilities.map((fac) => (
                  <option key={fac.id || fac._id} value={fac.id || fac._id}>
                    {fac.location_name} ({fac.facility_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Concerned Department
              </label>
              <select
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-brand-deep-sage"
              >
                <option value="IN-GJ-IND">Gujarat Industries Department (IN-GJ-IND)</option>
                <option value="IN-MH-IND">Maharashtra Directorate of Industries (IN-MH-IND)</option>
                <option value="GPCB-ENV">Gujarat Pollution Control Board (GPCB-ENV)</option>
                <option value="MPCB-ENV">Maharashtra Pollution Control Board (MPCB-ENV)</option>
                <option value="GJ-DISH">Directorate of Industrial Safety & Health (GJ-DISH)</option>
                <option value="IN-CEN-MSME">Ministry of MSME (IN-CEN-MSME)</option>
              </select>
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Grievance Category
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-brand-deep-sage"
              >
                {categories.map((c) => (
                  <option key={c.category_code} value={c.category_code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-brand-deep-sage"
              >
                <option value="LOW">Low (Standard SLA)</option>
                <option value="NORMAL">Normal (15 Days Target)</option>
                <option value="HIGH">High (5-7 Days Target)</option>
                <option value="URGENT">Urgent (Expedited Escalation)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2.5 bg-white focus:ring-1 focus:ring-brand-deep-sage"
              >
                <option value="MINOR">Minor Administrative Inconvenience</option>
                <option value="MODERATE">Moderate Procedural Delay</option>
                <option value="MAJOR">Major Financial or Inspection Discrepancy</option>
                <option value="CRITICAL">Critical Compliance Stoppage</option>
              </select>
            </div>
          </div>

          {/* Subject & Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subject Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Brief summary of the issue (e.g., Delay in factory license scrutiny response)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs border border-stone-200 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-deep-sage"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Provide chronological facts, communication references, and specific redressal sought..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-stone-200 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-deep-sage"
              required
            />
          </div>

          {/* Track B Specific External Tracking Fields */}
          {track === 'EXTERNAL' && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-charcoal">
                <ExternalLink className="w-4 h-4 text-brand-amber" />
                External Government Submission Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    External Authority Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DARPG / CPGRAMS, State Single Window Board"
                    value={authorityName}
                    onChange={(e) => setAuthorityName(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Official Portal URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://pgportal.gov.in"
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    External Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DARPG/E/2026/001928"
                    value={externalReference}
                    onChange={(e) => setExternalReference(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Applicant-Reported Status
                  </label>
                  <select
                    value={externalStatus}
                    onChange={(e) => setExternalStatus(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
                  >
                    <option value="SUBMITTED">Submitted / Awaiting Scrutiny</option>
                    <option value="UNDER_PROCESS">Under Process with Authority</option>
                    <option value="REFERRED">Referred to District Collectorate</option>
                    <option value="RESOLVED_EXTERNALLY">Resolved by Authority</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Statutory Reference & Legal Safety Notice */}
          <div className="p-4 bg-brand-cream/50 border border-stone-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-brand-charcoal">
              <ShieldAlert className="w-4 h-4 text-brand-deep-sage" />
              Statutory Citation & Legal Source Safety (Optional)
            </div>
            <p className="text-[11px] text-stone-500">
              If referencing a statutory rule or government notification, provide verified details. Note: Section 16(2) of Gujarat Single Window Clearances Act, 2017 does not prescribe a 30-day resolution timeline. Unverified timelines are labeled "NEEDS_CONFIRMATION".
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Act or Rule (e.g. Factories Act, 1948)"
                value={actOrRule}
                onChange={(e) => setActOrRule(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
              />
              <input
                type="text"
                placeholder="Section / Clause (e.g. Section 6)"
                value={sectionClause}
                onChange={(e) => setSectionClause(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
              />
              <input
                type="url"
                placeholder="Official Source URL (.gov.in)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-white"
              />
            </div>
          </div>

          {/* Vault Document Attachments */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Attach Supporting Vault Documents
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
              Select verified documents from your private vault. Documents will be previewed by officers via 15-minute temporary secure links.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-stone-200 rounded-lg bg-stone-50/50">
              {vaultDocs.length === 0 ? (
                <div className="text-xs text-stone-400 p-2">No vault documents available.</div>
              ) : (
                vaultDocs.map((doc) => {
                  const docId = doc.id || doc._id;
                  const isSelected = selectedVaultDocs.includes(docId);
                  return (
                    <div
                      key={docId}
                      onClick={() => toggleDocSelection(docId)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-brand-pale-sage/60 border-brand-deep-sage text-brand-deep-sage font-semibold'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{doc.document_name || doc.original_filename}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-brand-deep-sage focus:ring-0 shrink-0"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <Link
              to="/grievances"
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-deep-sage hover:bg-brand-charcoal rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
