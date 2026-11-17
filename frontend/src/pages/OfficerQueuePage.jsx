import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  Building2,
  Calendar,
  IndianRupee,
  Paperclip,
  Check,
  X,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { officerAPI, applicationAPI, documentAPI } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const OfficerQueuePage = () => {
  const { user, isSuperAdmin } = useAuth();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Dossier for Scrutiny
  const [selectedApp, setSelectedApp] = useState(null);
  const [isScrutinyModalOpen, setIsScrutinyModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Officer Actions State
  const [actionType, setActionType] = useState('MARK_SCRUTINY'); // MARK_SCRUTINY | REQUEST_CLARIFICATION | APPROVE | REJECT
  const [actionRemarks, setActionRemarks] = useState('');
  const [clarificationQuery, setClarificationQuery] = useState('');
  const [validUntil, setValidUntil] = useState('2031-12-31');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Document Verification State
  const [docVerifyDoc, setDocVerifyDoc] = useState(null);
  const [docDecision, setDocDecision] = useState('VERIFIED');
  const [docRemarks, setDocRemarks] = useState('');
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docMsg, setDocMsg] = useState('');

  const officerProfile = user?.officer_profile || {};
  const deptCode = officerProfile.department_code || (isSuperAdmin ? 'ALL_DEPARTMENTS' : 'N/A');
  const jurisdictionCode = officerProfile.jurisdiction_code || (isSuperAdmin ? 'NATIONAL' : 'N/A');

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await officerAPI.listQueue({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.data?.success) {
        setQueue(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load officer scrutiny queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueue();
  };

  const handleOpenScrutiny = async (appId) => {
    try {
      setLoadingDetail(true);
      setIsScrutinyModalOpen(true);
      const res = await officerAPI.getDetail(appId);
      if (res.data?.success) {
        setSelectedApp(res.data.data);
        if (res.data.data.status === 'SUBMITTED') {
          setActionType('MARK_SCRUTINY');
          setActionRemarks('Application dossier accepted for technical review by departmental scrutiny officer in prototype workflow.');
        } else if (res.data.data.status === 'UNDER_SCRUTINY' || res.data.data.status === 'RESUBMITTED') {
          setActionType('APPROVE');
          setActionRemarks('All application parameters, facility drawings, and pollution abatement disclosures verified compliant in prototype evaluation.');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load application details.');
      setIsScrutinyModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedApp) return;
    if (!actionRemarks.trim()) {
      alert('Remarks are required for officer audit logs.');
      return;
    }
    if (actionType === 'REQUEST_CLARIFICATION' && !clarificationQuery.trim()) {
      alert('Clarification query instructions are required when raising queries.');
      return;
    }

    try {
      setSubmittingAction(true);
      const payload = {
        action: actionType,
        remarks: actionRemarks.trim(),
        clarification_query: actionType === 'REQUEST_CLARIFICATION' ? clarificationQuery.trim() : undefined,
        valid_until: actionType === 'APPROVE' ? validUntil : undefined,
      };

      const res = await officerAPI.action(selectedApp.id, payload);
      if (res.data?.success) {
        setIsScrutinyModalOpen(false);
        loadQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record officer decision.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDocPreview = async (doc) => {
    const docId = doc.vault_document_id || doc.id || doc._id;
    if (!docId) return;
    try {
      const res = await documentAPI.preview(docId);
      if (res.data?.data?.preview_url) {
        window.open(res.data.data.preview_url, '_blank');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to generate secure preview URL.');
    }
  };

  const handleVerifyDocSubmit = async (e) => {
    e.preventDefault();
    if (!docVerifyDoc) return;
    const docId = docVerifyDoc.vault_document_id || docVerifyDoc.id || docVerifyDoc._id;
    if (['CORRECTION_REQUESTED', 'REJECTED'].includes(docDecision) && !docRemarks.trim()) {
      alert(`Mandatory remarks required when decision is ${docDecision}.`);
      return;
    }
    setDocSubmitting(true);
    setDocMsg('');
    try {
      await documentAPI.verify(docId, {
        decision: docDecision,
        remarks: docRemarks.trim() || 'Verified compliant by scrutiny officer.'
      });
      setDocMsg(`Document successfully marked as ${docDecision}.`);
      setDocVerifyDoc(null);
      setDocRemarks('');
      if (selectedApp?.id) {
        handleOpenScrutiny(selectedApp.id);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to record document verification decision.');
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleDownloadPdf = async (appId, appNumber) => {
    try {
      const res = await applicationAPI.downloadAcknowledgement(appId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BizPermit_Acknowledgement_${appNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert('Failed to download PDF.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="submitted">Pending Scrutiny</Badge>;
      case 'UNDER_SCRUTINY':
        return <Badge variant="under_scrutiny">Under Review</Badge>;
      case 'CLARIFICATION':
        return <Badge variant="clarification">Query Raised</Badge>;
      case 'RESUBMITTED':
        return <Badge variant="resubmitted">Query Resubmitted</Badge>;
      case 'APPROVED':
        return <Badge variant="approved">Prototype Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="rejected">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Officer Authority Header */}
      <div className="bg-brand-deep-sage text-white rounded-xl p-6 shadow-md border border-brand-sage/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-brand-pale-sage uppercase font-bold">
            <Shield className="h-4 w-4 text-brand-amber" />
            <span>Department Scrutiny Desk • Prototype Simulation</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 tracking-tight">
            {isSuperAdmin ? 'National Regulatory Scrutiny Queue' : `${deptCode} Regulatory Desk`}
          </h1>
          <p className="text-xs text-brand-pale-sage mt-1">
            Authoritative desk for statutory document review, technical query issuance, and regulatory decision recording.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-pale-sage block">
              Authorized Scope
            </span>
            <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-brand-amber border border-white/20 inline-block mt-0.5">
              {jurisdictionCode} • {deptCode}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: 'All Pending & Active', val: '' },
            { label: 'Pending Initial Review', val: 'SUBMITTED' },
            { label: 'Under Review', val: 'UNDER_SCRUTINY' },
            { label: 'Awaiting Applicant', val: 'CLARIFICATION' },
            { label: 'Resubmitted', val: 'RESUBMITTED' },
            { label: 'Approved', val: 'APPROVED' },
            { label: 'Rejected', val: 'REJECTED' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 cursor-pointer ${
                statusFilter === tab.val
                  ? 'bg-brand-deep-sage text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search ref #, approval, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-sage"
          />
          <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-2.5" />
        </form>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="p-16 text-center text-xs text-stone-500 bg-white rounded-lg border border-stone-200">
          Loading departmental queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 bg-brand-pale-sage text-brand-deep-sage rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-brand-charcoal">Queue Clear</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {statusFilter
              ? `No dossiers found matching filter '${statusFilter}' in your assigned department jurisdiction.`
              : 'There are currently no active applications awaiting scrutiny in your departmental queue.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm divide-y divide-stone-200">
          {queue.map((app) => (
            <div
              key={app.id}
              className="p-4 hover:bg-stone-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-brand-deep-sage bg-brand-pale-sage px-2 py-0.5 rounded">
                    {app.application_number}
                  </span>
                  {getStatusBadge(app.status)}
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded uppercase">
                    {app.department_code}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                    {app.state_code || 'NATIONAL'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-brand-charcoal truncate">
                  {app.approval_title}
                </h4>

                <div className="flex items-center gap-4 text-xs text-stone-500 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-stone-700">
                    <Building2 className="h-3.5 w-3.5 text-stone-400" />
                    {app.applicant_form_data?.enterprise_legal_name}
                  </span>
                  <span>•</span>
                  <span>{app.applicant_form_data?.plant_name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    Submitted: {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5 text-stone-400" />
                    {app.attached_documents?.length || 0} Blueprints
                  </span>
                </div>

                {app.status === 'RESUBMITTED' && (
                  <div className="mt-2 p-2 rounded bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-1.5">
                    <span className="font-bold">Applicant Responded:</span>
                    <span>{app.clarification_query?.response_text || 'Clarification documents submitted.'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                <Button
                  size="sm"
                  onClick={() => handleOpenScrutiny(app.id)}
                  className="bg-brand-deep-sage hover:bg-[#283b31] text-white text-xs font-semibold shadow-sm flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open Scrutiny Desk
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scrutiny Modal */}
      {isScrutinyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-stone-200 bg-brand-deep-sage text-white px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white">
                    {selectedApp?.application_number || 'Loading...'}
                  </span>
                  {selectedApp && getStatusBadge(selectedApp.status)}
                </div>
                <h3 className="text-base font-bold mt-1 text-white">
                  {selectedApp?.approval_title}
                </h3>
              </div>
              <button
                onClick={() => setIsScrutinyModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-md cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-16 text-center text-xs text-stone-500">
                Loading applicant dossier and blueprints...
              </div>
            ) : selectedApp ? (
              <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-2">
                    Applicant Enterprise & Facility Specifications
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs">
                    <div>
                      <span className="text-stone-500 block text-[11px]">Enterprise Legal Name</span>
                      <strong className="text-brand-charcoal">{selectedApp.applicant_form_data?.enterprise_legal_name}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Corporate PAN</span>
                      <strong className="font-mono text-brand-charcoal">{selectedApp.applicant_form_data?.enterprise_pan}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Business Location</span>
                      <strong className="text-brand-charcoal">{selectedApp.applicant_form_data?.plant_name}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Sector / NIC Code</span>
                      <strong className="text-brand-charcoal">
                        {selectedApp.applicant_form_data?.industry_sector} ({selectedApp.applicant_form_data?.nic_code})
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Scale & Pollution Category</span>
                      <strong className="text-brand-charcoal">
                        {selectedApp.applicant_form_data?.scale} • {selectedApp.applicant_form_data?.pollution_category}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[11px]">Project Capital Cost</span>
                      <strong className="text-brand-charcoal">
                        ₹{selectedApp.applicant_form_data?.project_capital_cost_lakhs} Lakhs
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Attached Vault Documents & Blueprints */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-2">
                    Verified Blueprints & Vault Attachments ({selectedApp.attached_documents?.length || 0})
                  </h4>
                  {selectedApp.attached_documents?.length === 0 ? (
                    <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-400 italic">
                      No documents attached.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                      {selectedApp.attached_documents.map((doc, idx) => (
                        <div key={idx} className="p-3.5 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-semibold text-brand-charcoal">{doc.document_name}</div>
                            <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                              Category: {doc.document_category} • Checksum SHA-256: {doc.sha256_checksum?.slice(0, 20)}...
                            </div>
                            {doc.verification_status && (
                              <div className="text-[10px] text-brand-deep-sage font-medium mt-1">
                                Status: <strong className="uppercase">{doc.verification_status}</strong>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDocPreview(doc)}
                              className="px-2.5 py-1 text-[11px] rounded border border-stone-300 text-stone-700 hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDocVerifyDoc(doc); setDocDecision('VERIFIED'); setDocRemarks(''); }}
                              className="px-2.5 py-1 text-[11px] rounded bg-brand-deep-sage text-white font-medium hover:bg-[#283b31] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Scrutinize Document
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Departmental Scrutiny Action Console */}
                <div className="p-5 rounded-xl bg-brand-cream/50 border border-stone-300 space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                    <Shield className="h-4 w-4 text-brand-deep-sage" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal font-mono">
                      Department Officer Review Console
                    </h4>
                  </div>

                  {/* Action Selection Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'MARK_SCRUTINY', label: '1. Mark Under Scrutiny', activeClass: 'bg-amber-100 text-amber-900 border-amber-400' },
                      { type: 'REQUEST_CLARIFICATION', label: '2. Raise Clarification', activeClass: 'bg-orange-100 text-orange-900 border-orange-400' },
                      { type: 'APPROVE', label: '3. Record Approval Decision', activeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
                      { type: 'REJECT', label: '4. Reject Dossier', activeClass: 'bg-rose-100 text-rose-900 border-rose-400' },
                    ].map((act) => (
                      <button
                        key={act.type}
                        type="button"
                        onClick={() => {
                          setActionType(act.type);
                          if (act.type === 'MARK_SCRUTINY') {
                            setActionRemarks('Application dossier taken up for technical scrutiny by departmental officer.');
                          } else if (act.type === 'APPROVE') {
                            setActionRemarks('All application parameters and facility documentation verified compliant.');
                          } else if (act.type === 'REJECT') {
                            setActionRemarks('Application rejected due to non-compliance with siting norms.');
                          }
                        }}
                        className={`text-xs p-2.5 rounded-lg border font-semibold text-center transition-all cursor-pointer ${
                          actionType === act.type
                            ? `${act.activeClass} shadow-sm ring-1 ring-current`
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>

                  {/* Action Specific Fields */}
                  <div className="space-y-3 text-xs">
                    {actionType === 'REQUEST_CLARIFICATION' && (
                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">
                          Clarification Query Details for Applicant *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Specify the missing blueprints, hazardous containment specs, or ZLD calculations required..."
                          value={clarificationQuery}
                          onChange={(e) => setClarificationQuery(e.target.value)}
                          className="w-full border border-stone-300 rounded p-2.5 focus:ring-1 focus:ring-brand-sage text-xs"
                        />
                      </div>
                    )}

                    {actionType === 'APPROVE' && (
                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">
                          Approval Decision Validity Until
                        </label>
                        <input
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          className="border border-stone-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-brand-sage text-xs"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-stone-800 mb-1">
                        Officer Remarks / Review Findings *
                      </label>
                      <textarea
                        rows={2}
                        value={actionRemarks}
                        onChange={(e) => setActionRemarks(e.target.value)}
                        className="w-full border border-stone-300 rounded p-2.5 focus:ring-1 focus:ring-brand-sage text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsScrutinyModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExecuteAction}
                      disabled={submittingAction}
                      className="bg-brand-deep-sage text-white font-semibold flex items-center gap-1.5"
                    >
                      {submittingAction ? 'Recording Decision...' : 'Record Decision'}
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-3">
                    Audit Trail & Transition Timeline
                  </h4>
                  <div className="relative pl-6 space-y-4 border-l-2 border-stone-200 ml-2">
                    {(selectedApp.status_history || []).map((entry, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-deep-sage shadow" />
                        <div className="text-xs font-bold text-brand-charcoal flex items-center gap-2">
                          <span>{entry.to_status}</span>
                          <span className="text-[10px] font-normal text-stone-500 font-mono">
                            {entry.changed_at ? new Date(entry.changed_at).toLocaleString('en-IN') : ''}
                          </span>
                        </div>
                        {entry.remarks && (
                          <p className="text-[11px] text-stone-600 mt-0.5 bg-stone-50 p-2 rounded border border-stone-100">
                            {entry.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Document Scrutiny Modal */}
      {docVerifyDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-brand-deep-sage text-white">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-amber" />
                <h4 className="font-bold text-xs">Verify Vault Document</h4>
              </div>
              <button onClick={() => setDocVerifyDoc(null)} className="p-1 text-white/70 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyDocSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <div className="font-bold text-brand-charcoal text-sm">{docVerifyDoc.document_name}</div>
                <div className="text-[10px] text-stone-500 font-mono mt-0.5">Category: {docVerifyDoc.document_category}</div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Verification Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'VERIFIED', label: 'Verify', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                    { id: 'CORRECTION_REQUESTED', label: 'Need Correction', color: 'bg-amber-50 text-amber-800 border-amber-300' },
                    { id: 'REJECTED', label: 'Reject', color: 'bg-rose-50 text-rose-800 border-rose-300' }
                  ].map((dec) => (
                    <button
                      key={dec.id}
                      type="button"
                      onClick={() => setDocDecision(dec.id)}
                      className={`p-2 rounded border text-center font-semibold transition-all cursor-pointer ${
                        docDecision === dec.id
                          ? `${dec.color} ring-2 ring-current font-bold`
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      {dec.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Scrutiny Findings / Remarks {['CORRECTION_REQUESTED', 'REJECTED'].includes(docDecision) && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={docRemarks}
                  onChange={(e) => setDocRemarks(e.target.value)}
                  placeholder={
                    docDecision === 'VERIFIED'
                      ? 'Verified compliant with statutory dimensions...'
                      : 'Specify deficiencies, missing signatures, or corrected drawings required...'
                  }
                  className="w-full border border-stone-300 rounded p-2 text-xs focus:ring-1 focus:ring-brand-sage"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setDocVerifyDoc(null)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={docSubmitting} className="bg-brand-deep-sage text-white">
                  {docSubmitting ? 'Recording...' : 'Record Verification'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
