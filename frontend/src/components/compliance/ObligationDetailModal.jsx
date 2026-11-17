import React, { useState, useEffect } from 'react';
import { complianceAPI, documentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  X,
  Calendar,
  Building,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle,
  Paperclip,
  CheckSquare,
  AlertCircle,
  History,
  Lock,
  ExternalLink,
} from 'lucide-react';

export const ObligationDetailModal = ({
  obligationId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { isDepartmentOfficer, isSuperAdmin } = useAuth();
  const [obligation, setObligation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // details | complete | history | review

  // Completion Form State
  const [remarks, setRemarks] = useState('');
  const [needsOfficerReview, setNeedsOfficerReview] = useState(false);
  const [selectedVaultDocIds, setSelectedVaultDocIds] = useState([]);
  const [availableVaultDocs, setAvailableVaultDocs] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Date Confirmation Form State
  const [confirmedDate, setConfirmedDate] = useState('');

  // Officer Review State
  const [reviewDecision, setReviewDecision] = useState('VERIFIED_COMPLETE');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    if (isOpen && obligationId) {
      loadObligationDetail();
    } else {
      setObligation(null);
      setError(null);
      setRemarks('');
      setSelectedVaultDocIds([]);
    }
  }, [isOpen, obligationId]);

  const loadObligationDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complianceAPI.getObligation(obligationId);
      const data = res.data?.data;
      setObligation(data);
      if (data?.due_date) {
        setConfirmedDate(data.due_date.substring(0, 10));
      }
      if (data?.facility_id) {
        loadVaultDocuments(data.facility_id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load obligation details');
    } finally {
      setLoading(false);
    }
  };

  const loadVaultDocuments = async (facilityId) => {
    setLoadingVault(true);
    try {
      const res = await documentAPI.list({ location_id: facilityId });
      setAvailableVaultDocs(res.data?.data || []);
    } catch {
      setAvailableVaultDocs([]);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleConfirmDate = async (e) => {
    e.preventDefault();
    if (!confirmedDate) return;
    setSubmitting(true);
    setError(null);
    try {
      await complianceAPI.confirmDate(obligationId, {
        confirmed_due_date: new Date(confirmedDate).toISOString(),
      });
      await loadObligationDetail();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to confirm date');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteObligation = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError('Completion remarks are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await complianceAPI.completeObligation(obligationId, {
        completion_remarks: remarks.trim(),
        vault_document_ids: selectedVaultDocIds,
        needs_officer_review: needsOfficerReview,
      });
      setRemarks('');
      setSelectedVaultDocIds([]);
      await loadObligationDetail();
      setActiveTab('history');
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to complete obligation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficerReview = async (recordId) => {
    if (!officerRemarks.trim()) {
      setError('Officer remarks are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await complianceAPI.reviewObligation(obligationId, recordId, {
        decision: reviewDecision,
        remarks: officerRemarks.trim(),
      });
      setOfficerRemarks('');
      setSelectedRecordId(null);
      await loadObligationDetail();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit officer review');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVaultDoc = (docId) => {
    if (selectedVaultDocIds.includes(docId)) {
      setSelectedVaultDocIds(selectedVaultDocIds.filter((id) => id !== docId));
    } else {
      setSelectedVaultDocIds([...selectedVaultDocIds, docId]);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    return <Badge variant={s}>{status}</Badge>;
  };

  const getVerificationBadge = (verification) => {
    if (verification === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          STATUTORY VERIFIED
        </span>
      );
    }
    if (verification === 'NEEDS_CONFIRMATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-300">
          <AlertCircle className="h-3 w-3 text-purple-600" />
          NEEDS DATE CONFIRMATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-300">
        <Clock className="h-3 w-3 text-sky-600" />
        INDICATIVE INTERNAL
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="bg-brand-cream/80 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-deep-sage/10 text-brand-deep-sage rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                  {obligation?.obligation_number || 'OBLIGATION'}
                </span>
                {obligation?.source_verification_status &&
                  getVerificationBadge(obligation.source_verification_status)}
              </div>
              <h2 className="text-base font-bold text-brand-charcoal">
                {obligation?.title || 'Compliance Obligation Details'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center text-stone-500">
            <div className="animate-spin h-7 w-7 border-2 border-brand-deep-sage border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading obligation details...</p>
          </div>
        )}

        {error && (
          <div className="p-4 mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!loading && obligation && (
          <div>
            {/* Tabs Bar */}
            <div className="flex border-b border-stone-200 bg-stone-50/50 px-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 px-4 border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-brand-deep-sage text-brand-deep-sage font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Overview & Status
              </button>
              {obligation.status !== 'COMPLETED' && obligation.status !== 'NOT_APPLICABLE' && (
                <button
                  onClick={() => setActiveTab('complete')}
                  className={`py-3 px-4 border-b-2 transition-colors ${
                    activeTab === 'complete'
                      ? 'border-brand-deep-sage text-brand-deep-sage font-bold'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Record Completion
                </button>
              )}
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-brand-deep-sage text-brand-deep-sage font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Cycle History ({obligation.completion_records?.length || 0})
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  {/* Key Attribute Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="text-stone-400 text-[10px] font-mono uppercase">Current Status</div>
                      <div className="mt-1 font-semibold">{getStatusBadge(obligation.status)}</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="text-stone-400 text-[10px] font-mono uppercase">Due Date</div>
                      <div className="mt-1 font-semibold text-brand-charcoal">
                        {obligation.due_date
                          ? new Date(obligation.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Not Scheduled'}
                      </div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="text-stone-400 text-[10px] font-mono uppercase">Frequency</div>
                      <div className="mt-1 font-semibold text-brand-charcoal">{obligation.frequency}</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="text-stone-400 text-[10px] font-mono uppercase">Current Cycle</div>
                      <div className="mt-1 font-bold text-brand-deep-sage">Cycle #{obligation.current_cycle_number}</div>
                    </div>
                  </div>

                  {/* Needs Confirmation Banner */}
                  {obligation.status === 'NEEDS_CONFIRMATION' && (
                    <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        <span>Action Required: Statutory Date Confirmation</span>
                      </div>
                      <p className="text-xs text-purple-800">
                        {obligation.confirmation_guidance ||
                          'Please confirm the statutory milestone date to activate recurring reminders and tracking.'}
                      </p>
                      <form onSubmit={handleConfirmDate} className="flex items-center gap-3 pt-2">
                        <input
                          type="date"
                          value={confirmedDate}
                          onChange={(e) => setConfirmedDate(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                        <Button type="submit" size="sm" disabled={submitting}>
                          {submitting ? 'Confirming...' : 'Confirm Statutory Due Date'}
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Obligation Details */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="font-semibold text-stone-700 mb-1">Description & Scope</h4>
                      <p className="text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
                        {obligation.description || 'Statutory compliance obligation requirements.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                        <div className="font-semibold text-stone-700">Authority & Jurisdiction</div>
                        <div className="flex items-center gap-2 text-stone-600">
                          <Landmark className="h-4 w-4 text-brand-amber shrink-0" />
                          <span>{obligation.department_code} — {obligation.jurisdiction_tier}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          Category: {obligation.compliance_category}
                        </div>
                      </div>

                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                        <div className="font-semibold text-stone-700">Legal Reference & Source</div>
                        <div className="text-stone-600">
                          {obligation.legal_act_reference || 'Indian Factory & Environmental Regulations'}
                        </div>
                        {obligation.official_source_url && (
                          <a
                            href={obligation.official_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-deep-sage hover:underline"
                          >
                            <span>Official Authority Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {obligation.penalties_applicable && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-xs">
                        <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Statutory Penalty Warning
                        </div>
                        <p>{obligation.penalties_applicable}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COMPLETE OBLIGATION */}
              {activeTab === 'complete' && (
                <form onSubmit={handleCompleteObligation} className="space-y-4 text-xs">
                  <div className="p-3 bg-brand-pale-sage/40 border border-brand-sage/40 rounded-lg">
                    <h4 className="font-bold text-brand-deep-sage mb-1">
                      Complete Cycle #{obligation.current_cycle_number}
                    </h4>
                    <p className="text-stone-600 text-[11px]">
                      Provide evidence documents from your Secure BizPermit Vault and enter filing remarks.
                      Upon completion, next recurrence cycle date will be automatically scheduled.
                    </p>
                  </div>

                  {/* Completion Remarks */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Completion / Filing Remarks <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Form V Environmental Statement filed online via GPCB XGN portal. Challan #98234 acknowledgment attached."
                      className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-brand-deep-sage focus:outline-none"
                      required
                    />
                  </div>

                  {/* Attach Vault Documents by Reference */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Attach Evidence from Vault (Referenced Immutably)
                    </label>
                    {loadingVault ? (
                      <p className="text-stone-400">Loading vault documents...</p>
                    ) : availableVaultDocs.length === 0 ? (
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-500 text-center">
                        No vault documents uploaded for this business location yet. You can complete with remarks or upload documents in the Document Vault first.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
                        {availableVaultDocs.map((doc) => {
                          const isSelected = selectedVaultDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => toggleVaultDoc(doc.id)}
                              className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-brand-pale-sage/50 text-brand-deep-sage' : 'hover:bg-stone-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className={`h-4 w-4 ${isSelected ? 'text-brand-deep-sage' : 'text-stone-400'}`} />
                                <div>
                                  <div className="font-semibold">{doc.document_name}</div>
                                  <div className="text-[10px] text-stone-400 font-mono">
                                    {doc.document_category} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4 text-brand-deep-sage rounded border-stone-300"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedVaultDocIds.length > 0 && (
                      <p className="text-[11px] text-brand-deep-sage mt-1 font-semibold">
                        {selectedVaultDocIds.length} vault document(s) selected as evidence
                      </p>
                    )}
                  </div>

                  {/* Needs Officer Review Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="officerReviewCheck"
                      checked={needsOfficerReview}
                      onChange={(e) => setNeedsOfficerReview(e.target.checked)}
                      className="h-4 w-4 text-brand-deep-sage rounded border-stone-300"
                    />
                    <label htmlFor="officerReviewCheck" className="text-stone-700 font-medium cursor-pointer">
                      Request Department Officer Internal Scrutiny for this completion
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('details')}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Mark Compliance Completed'}
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: CYCLE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4 text-xs">
                  <div className="font-semibold text-stone-700">Archived Completion Cycles</div>
                  {(!obligation.completion_records || obligation.completion_records.length === 0) ? (
                    <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-lg border border-stone-200">
                      No completion cycles recorded yet for this obligation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {obligation.completion_records.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-brand-deep-sage">
                              Cycle #{rec.cycle_number} Completion
                            </span>
                            <span className="text-[11px] text-stone-500">
                              Completed: {new Date(rec.completed_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <p className="text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                            {rec.completion_remarks}
                          </p>

                          {/* Evidence Docs */}
                          {rec.attached_documents && rec.attached_documents.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-mono uppercase text-stone-400">
                                Attached Evidence Snapshot
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {rec.attached_documents.map((d, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 text-stone-700 text-[10px] border border-stone-200"
                                  >
                                    <Paperclip className="h-3 w-3 text-stone-400" />
                                    <span>{d.document_name}</span>
                                    {d.sha256_checksum && (
                                      <span className="text-[9px] font-mono text-stone-400">
                                        ({d.sha256_checksum.substring(0, 8)}...)
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Review Status */}
                          <div className="flex items-center justify-between pt-1 border-t border-stone-200/80 text-[11px]">
                            <span className="text-stone-500">
                              Review Status: <strong className="text-stone-800">{rec.review_status}</strong>
                            </span>
                            {rec.reviewed_at && (
                              <span className="text-stone-400">
                                Reviewed on {new Date(rec.reviewed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Officer Review Form (if Officer or Admin and pending review) */}
                          {(isDepartmentOfficer || isSuperAdmin) && rec.review_status === 'PENDING_REVIEW' && (
                            <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                              <div className="font-bold text-amber-900 text-xs">Department Officer Verification</div>
                              <div className="flex gap-2">
                                <select
                                  value={reviewDecision}
                                  onChange={(e) => setReviewDecision(e.target.value)}
                                  className="px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                                >
                                  <option value="VERIFIED_COMPLETE">VERIFIED_COMPLETE (Accept Evidence)</option>
                                  <option value="REJECTED_INCOMPLETE">REJECTED_INCOMPLETE (Reject / Resubmit)</option>
                                </select>
                              </div>
                              <textarea
                                rows={2}
                                value={officerRemarks}
                                onChange={(e) => setOfficerRemarks(e.target.value)}
                                placeholder="Enter officer scrutiny assessment remarks..."
                                className="w-full p-2 text-xs border border-amber-300 rounded bg-white focus:outline-none"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleOfficerReview(rec.id)}
                                disabled={submitting}
                              >
                                {submitting ? 'Submitting...' : 'Record Officer Decision'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
