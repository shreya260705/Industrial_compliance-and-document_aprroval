import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  UploadCloud,
  Trash2,
  Lock,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
  FileCheck2,
  Clock,
  Info,
  UserCheck
} from 'lucide-react';
import { schemeApplicationAPI, documentAPI, schemeAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchemeApplicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editable Dossier Data
  const [projectCost, setProjectCost] = useState('');
  const [eligibleInvestment, setEligibleInvestment] = useState('');
  const [employment, setEmployment] = useState('');
  const [commenceDate, setCommenceDate] = useState('');
  const [savingDossier, setSavingDossier] = useState(false);
  const [dossierSuccess, setDossierSuccess] = useState(false);

  // Vault Attachment Modal
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultDocuments, setVaultDocuments] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultLoadError, setVaultLoadError] = useState('');
  const [selectedVaultDocId, setSelectedVaultDocId] = useState('');
  const [docCategory, setDocCategory] = useState('GENERAL_COMPLIANCE');
  const [attachingDoc, setAttachingDoc] = useState(false);

  // Attestation Form State
  const [portalName, setPortalName] = useState('');
  const [ackNumber, setAckNumber] = useState('');
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attestConfirmed, setAttestConfirmed] = useState(false);
  const [attesting, setAttesting] = useState(false);
  const [attestError, setAttestError] = useState(null);

  // Clarification Response State
  const [respondingClrId, setRespondingClrId] = useState(null);
  const [clrResponseText, setClrResponseText] = useState('');
  const [submittingClr, setSubmittingClr] = useState(false);

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schemeApplicationAPI.get(id);
      const app = res.data?.data?.application;
      setApplication(app);

      // Populate form fields
      if (app?.dossier_data) {
        setProjectCost(app.dossier_data.project_cost_inr || '');
        setEligibleInvestment(app.dossier_data.claimed_eligible_investment_inr || '');
        setEmployment(app.dossier_data.employment_generation || '');
        setCommenceDate(app.dossier_data.commercial_production_date || '');
      }

      // Populate attestation defaults
      if (app?.external_submission) {
        setPortalName(app.external_submission.external_portal_name || '');
        setAckNumber(app.external_submission.external_acknowledgement_number || '');
        setSubmissionDate(app.external_submission.external_submission_date || '');
      }
    } catch (err) {
      console.error('Error loading application:', err);
      setError(err.response?.data?.error?.message || 'Failed to load application dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchApplication();
  }, [id]);

  const isLocked = application?.status === 'USER_REPORTED_EXTERNAL_SUBMISSION';

  // Save Dossier Data
  const handleSaveDossier = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setSavingDossier(true);
    setDossierSuccess(false);
    try {
      const payload = {
        dossier_data: {
          project_cost_inr: projectCost ? Number(projectCost) : null,
          claimed_eligible_investment_inr: eligibleInvestment ? Number(eligibleInvestment) : null,
          employment_generation: employment ? Number(employment) : null,
          commercial_production_date: commenceDate || null
        }
      };
      await schemeApplicationAPI.update(id, payload);
      setDossierSuccess(true);
      setTimeout(() => setDossierSuccess(false), 3000);
      fetchApplication();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error?.message || 'Failed to save dossier data.');
    } finally {
      setSavingDossier(false);
    }
  };

  // Status Progression
  const handleSetStatus = async (newStatus) => {
    if (isLocked) return;
    try {
      await schemeApplicationAPI.update(id, { status: newStatus });
      fetchApplication();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update dossier status.');
    }
  };

  // Open Vault Attachment Modal
  const openVaultModal = async () => {
    setShowVaultModal(true);
    setLoadingVault(true);
    setVaultLoadError('');
    try {
      const res = await documentAPI.list({ business_id: application.business_id, page_size: 100 });
      if (!res.data?.success || !Array.isArray(res.data.data)) {
        throw new Error(res.data?.error?.message || 'The server returned an invalid Vault document list.');
      }
      const docs = res.data.data.filter((doc) =>
        !doc.location_id || doc.location_id === application.location_id
      );
      setVaultDocuments(docs);
      if (docs.length > 0) setSelectedVaultDocId(docs[0].id);
    } catch (err) {
      console.error('Vault load error:', err);
      setVaultLoadError(err.response?.data?.error?.message || err.message || 'Failed to load Vault documents.');
    } finally {
      setLoadingVault(false);
    }
  };

  // Attach Document
  const handleAttachDocument = async (e) => {
    e.preventDefault();
    if (!selectedVaultDocId) return;
    setAttachingDoc(true);
    try {
      await schemeApplicationAPI.attachDocument(id, {
        vault_document_id: selectedVaultDocId,
        document_category: docCategory
      });
      setShowVaultModal(false);
      fetchApplication();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to attach document.');
    } finally {
      setAttachingDoc(false);
    }
  };

  // Remove Document
  const handleRemoveDocument = async (vaultDocId) => {
    if (isLocked) return;
    if (!window.confirm('Remove this document from the application dossier?')) return;
    try {
      await schemeApplicationAPI.removeDocument(id, vaultDocId);
      fetchApplication();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove document.');
    }
  };

  // Submit Self-Attestation
  const handleAttest = async (e) => {
    e.preventDefault();
    if (!attestConfirmed) {
      setAttestError('Please check the affirmation declaration checkbox.');
      return;
    }
    setAttesting(true);
    setAttestError(null);
    try {
      await schemeApplicationAPI.attest(id, {
        external_portal_name: portalName,
        external_acknowledgement_number: ackNumber,
        external_submission_date: submissionDate,
        attestation_confirmed: true
      });
      fetchApplication();
    } catch (err) {
      console.error('Attestation error:', err);
      setAttestError(err.response?.data?.error?.message || 'Attestation submission failed.');
    } finally {
      setAttesting(false);
    }
  };

  const handleRespondClarification = async (clarificationId) => {
    if (!clrResponseText.trim()) return;
    try {
      setSubmittingClr(true);
      await schemeApplicationAPI.respondClarification(id, {
        clarification_id: clarificationId,
        response_text: clrResponseText.trim()
      });
      setClrResponseText('');
      setRespondingClrId(null);
      fetchApplication();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit clarification response.');
    } finally {
      setSubmittingClr(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-3"></div>
        <p className="text-xs text-stone-500">Loading scheme dossier...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-lg text-rose-800 text-xs">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-600" />
          <div className="font-bold text-sm">Error Loading Application</div>
          <p className="mt-1">{error || 'Application dossier not found.'}</p>
        </div>
        <Button onClick={() => navigate('/scheme-applications')} variant="outline" className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Back to Applications</span>
        </Button>
      </div>
    );
  }

  const attachedDocs = application.attached_vault_documents || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/scheme-applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-brand-deep-sage"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Scheme Applications</span>
        </Link>

        <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500">
          <span>Snapshot Hash: {application.profile_snapshot_hash?.slice(0, 12)}...</span>
        </div>
      </div>

      {/* Locked Submission Banner */}
      {isLocked && (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-xl text-emerald-900 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <span>Officially Submitted & User-Attested Dossier (Locked)</span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-800 font-bold">
              v1.4-USER-SELF-ATTESTATION
            </span>
          </div>
          <p className="text-xs text-emerald-800">
            This dossier was formally recorded as submitted on <strong>{application.external_submission?.external_portal_name}</strong> with Acknowledgement/ARN <strong>{application.external_submission?.external_acknowledgement_number}</strong> on {application.external_submission?.external_submission_date}. All dossier data and attached documents are now immutable.
          </p>
          <div className="text-[11px] text-emerald-700/90 pt-1 border-t border-emerald-200/60">
            {application.external_submission?.disclaimer}
          </div>
        </div>
      )}

      {/* Dossier Header Card */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-brand-pale-sage text-brand-deep-sage px-2 py-0.5 rounded">
              {application.application_reference}
            </span>
            <span className="text-xs font-semibold text-stone-600">
              {application.scheme_code}
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              Rule v{application.scheme_rule_version}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Dossier Status:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
              isLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
            }`}>
              {application.status}
            </span>
            {application.review_status && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-900">
                Review: {application.review_status}
              </span>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-brand-charcoal">
            {application.scheme_name || application.scheme_code}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Application Dossier for Business Location • Created {new Date(application.created_at).toLocaleString()}
          </p>
        </div>

        {/* Assigned Scrutiny Officer Card */}
        {application.assigned_officer_name && (
          <div className="p-3.5 bg-brand-pale-sage/50 rounded-lg border border-brand-deep-sage/30 text-xs text-brand-deep-sage flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-brand-deep-sage shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-stone-900 text-sm">
                Assigned Scrutiny Officer: {application.assigned_officer_name}
              </div>
              <div className="text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Official Email: <strong className="font-mono text-stone-800">{application.assigned_officer_email}</strong></span>
                {application.assigned_officer_department && (
                  <span>Department: <strong>{application.assigned_officer_department}</strong></span>
                )}
                {application.assigned_officer_badge && (
                  <span>Badge: #{application.assigned_officer_badge}</span>
                )}
              </div>
              {application.assigned_at && (
                <div className="text-[10px] text-stone-500 font-mono">
                  Assigned on {new Date(application.assigned_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Progression Stepper */}
        {!isLocked && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-400 font-semibold text-[11px]">Workflow Phase:</span>
            <button
              onClick={() => handleSetStatus('DRAFT')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                application.status === 'DRAFT'
                  ? 'bg-brand-deep-sage text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              1. Draft
            </button>
            <button
              onClick={() => handleSetStatus('DOCUMENT_ASSEMBLY')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                application.status === 'DOCUMENT_ASSEMBLY'
                  ? 'bg-brand-deep-sage text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              2. Document Assembly
            </button>
            <button
              onClick={() => handleSetStatus('READY_FOR_FILING')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                application.status === 'READY_FOR_FILING'
                  ? 'bg-brand-amber text-brand-charcoal font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              3. Ready for External Filing
            </button>
          </div>
        )}
      </div>

      {/* Officer Scrutiny Outcome (if completed) */}
      {application.review_decision && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Administrative Evaluation Result: {application.review_decision.decision}</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            {application.review_decision.remarks}
          </p>
          <div className="text-[10px] text-emerald-700 font-mono">
            Evaluated on {new Date(application.review_decision.timestamp).toLocaleString()}
          </div>
          <div className="text-[10px] bg-white/70 p-2 rounded border border-emerald-200 text-emerald-900">
            {application.review_decision.prototype_disclaimer}
          </div>
        </div>
      )}

      {/* Clarification Loop Card (if clarifications exist) */}
      {application.clarifications && application.clarifications.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Department Officer Technical Clarifications</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">
              {application.clarifications.filter(c => c.status !== 'RESOLVED').length} Pending
            </span>
          </div>

          <div className="space-y-4">
            {application.clarifications.map((clr) => (
              <div key={clr.clarification_id} className="p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-brand-deep-sage">{clr.clarification_id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    clr.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {clr.status || 'PENDING'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-stone-500 block text-[10px] uppercase font-mono">Officer Query:</span>
                  <p className="text-stone-800 mt-0.5 font-medium">{clr.question}</p>
                </div>

                {clr.status === 'RESOLVED' ? (
                  <div className="bg-emerald-50/70 p-3 rounded border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-900 block text-[10px] uppercase font-mono">Submitted Response:</span>
                    <p className="text-emerald-800">{clr.applicant_response}</p>
                    <span className="text-[10px] text-emerald-600 block">
                      Recorded on {new Date(clr.responded_at).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <span className="font-bold text-brand-charcoal block">Your Response:</span>
                    <textarea
                      rows={3}
                      placeholder="Provide precise clarification and explanations for the scrutiny officer..."
                      value={respondingClrId === clr.clarification_id ? clrResponseText : ''}
                      onFocus={() => setRespondingClrId(clr.clarification_id)}
                      onChange={(e) => {
                        setRespondingClrId(clr.clarification_id);
                        setClrResponseText(e.target.value);
                      }}
                      className="w-full text-xs rounded border border-stone-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={submittingClr || !clrResponseText.trim() || respondingClrId !== clr.clarification_id}
                        onClick={() => handleRespondClarification(clr.clarification_id)}
                        className="bg-brand-deep-sage text-white text-xs px-4"
                      >
                        {submittingClr && respondingClrId === clr.clarification_id ? 'Submitting...' : 'Submit Official Response'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Project Information & Financial Metrics */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-deep-sage" />
            1. Project Investment & Production Data
          </h2>
          {isLocked && <Lock className="h-4 w-4 text-stone-400" />}
        </div>

        <form onSubmit={handleSaveDossier} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Total Gross Fixed Capital Investment (₹ INR)
              </label>
              <input
                type="number"
                disabled={isLocked}
                value={projectCost}
                onChange={(e) => setProjectCost(e.target.value)}
                placeholder="e.g. 45000000"
                className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Claimed Eligible Plant & Machinery Investment (₹ INR)
              </label>
              <input
                type="number"
                disabled={isLocked}
                value={eligibleInvestment}
                onChange={(e) => setEligibleInvestment(e.target.value)}
                placeholder="e.g. 35000000"
                className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Proposed Direct Employment (Headcount)
              </label>
              <input
                type="number"
                disabled={isLocked}
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
                placeholder="e.g. 45"
                className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Date of Commercial Production (DCOP)
              </label>
              <input
                type="date"
                disabled={isLocked}
                value={commenceDate}
                onChange={(e) => setCommenceDate(e.target.value)}
                className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>
          </div>

          {!isLocked && (
            <div className="flex items-center justify-between pt-2">
              {dossierSuccess && (
                <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Dossier metrics saved successfully
                </span>
              )}
              <Button
                type="submit"
                disabled={savingDossier}
                className="bg-stone-800 hover:bg-stone-900 text-white text-xs px-4 ml-auto"
              >
                {savingDossier ? 'Saving...' : 'Save Dossier Metrics'}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Step 2: Document Vault Checklist & Attachments */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-brand-amber" />
              2. Attached Statutory Vault Documents ({attachedDocs.length})
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Certificates and NOCs linked directly from your enterprise Document Vault without duplicate uploads.
            </p>
          </div>

          {!isLocked && (
            <Button
              size="sm"
              onClick={openVaultModal}
              className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Attach from Vault</span>
            </Button>
          )}
        </div>

        {attachedDocs.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/60 rounded-lg border border-dashed border-stone-300 space-y-2">
            <FolderArchive className="h-6 w-6 text-stone-400 mx-auto" />
            <div className="text-xs font-semibold text-stone-600">No vault documents attached yet</div>
            <p className="text-[11px] text-stone-400">
              Attach environmental consents (GPCB CTE/CTO), Udyam certificates, and DPRs before submitting.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachedDocs.map((doc, idx) => (
              <div
                key={idx}
                className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-stone-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-deep-sage" />
                    <span>{doc.file_name}</span>
                    <span className="text-[10px] font-mono bg-stone-200 px-1.5 py-0.2 rounded text-stone-600">
                      {doc.document_category}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Attached: {new Date(doc.attached_at).toLocaleString()} • Size: {(doc.file_size / 1024).toFixed(1)} KB
                  </div>
                </div>

                {!isLocked && (
                  <button
                    onClick={() => handleRemoveDocument(doc.vault_document_id)}
                    className="text-stone-400 hover:text-rose-600 p-1"
                    title="Remove document from dossier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: External Filing & User Self-Attestation Desk */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            3. External Portal Submission & User Self-Attestation Desk
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Record the external government portal submission metadata once filed on the State or Ministry Single Window Portal.
          </p>
        </div>

        {isLocked ? (
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-stone-400 text-[10px] font-semibold block">External Government Portal:</span>
                <span className="font-bold text-stone-800">{application.external_submission?.external_portal_name}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] font-semibold block">Official Acknowledgement / ARN:</span>
                <span className="font-mono font-bold text-stone-800">{application.external_submission?.external_acknowledgement_number}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] font-semibold block">Submission Date (IST):</span>
                <span className="font-mono text-stone-800">{application.external_submission?.external_submission_date}</span>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200">
              Attested by <strong>{application.external_submission?.user_email}</strong> on {new Date(application.external_submission?.attestation_timestamp).toLocaleString()}
            </div>
          </div>
        ) : (
          <form onSubmit={handleAttest} className="space-y-4 text-xs">
            {attestError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {attestError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Designated Government Portal *
                </label>
                <input
                  type="text"
                  required
                  value={portalName}
                  onChange={(e) => setPortalName(e.target.value)}
                  placeholder="e.g. Gujarat IFP / MSME Champions"
                  className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Official Acknowledgement Number / ARN *
                </label>
                <input
                  type="text"
                  required
                  value={ackNumber}
                  onChange={(e) => setAckNumber(e.target.value)}
                  placeholder="e.g. IFP-2026-GJ-98762"
                  className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Submission Date *
                </label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="w-full border border-stone-200 rounded px-3 py-2 text-xs bg-stone-50/50 focus:border-brand-deep-sage outline-none font-mono"
                />
              </div>
            </div>

            {/* Affirmation Checkbox */}
            <div className="p-4 bg-brand-cream/60 rounded-lg border border-stone-200 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attestConfirmed}
                  onChange={(e) => setAttestConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-brand-deep-sage focus:ring-brand-deep-sage"
                />
                <span className="text-[11px] text-stone-800 leading-relaxed">
                  <strong>Declaration of Authenticity (v1.4-USER-SELF-ATTESTATION):</strong> I hereby declare and affirm that this application was formally submitted on the designated external government portal, and that the portal name, acknowledgement/reference number, and filing date provided above are authentic and accurate to the best of my knowledge and belief.
                </span>
              </label>

              <div className="text-[10px] text-stone-500 pl-6">
                <strong>Legal Notice:</strong> This record represents an internal user self-attestation within the BizPermit SIH26130 workspace. It does not constitute a cryptographic Digital Signature Certificate (DSC) under Section 3 of the Information Technology Act, 2000, nor does it guarantee government receipt or statutory clearance.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={attesting || !attestConfirmed}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-5 py-2 font-bold flex items-center gap-2 shadow"
              >
                {attesting ? 'Recording Attestation...' : 'Record Official External Submission & Lock Dossier'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Attach from Vault Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-brand-charcoal flex items-center gap-2">
                <FolderArchive className="h-5 w-5 text-brand-deep-sage" />
                Attach Document from Vault
              </h3>
              <button
                onClick={() => setShowVaultModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            {loadingVault ? (
              <div className="py-8 text-center text-xs text-stone-500">Loading your Document Vault...</div>
            ) : vaultLoadError ? (
              <div role="alert" className="py-6 text-center text-xs text-rose-700">{vaultLoadError}</div>
            ) : vaultDocuments.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500">
                No documents found in your Document Vault. Please upload certificates in Document Vault first.
              </div>
            ) : (
              <form onSubmit={handleAttachDocument} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Select Document from Vault *
                  </label>
                  <select
                    value={selectedVaultDocId}
                    onChange={(e) => setSelectedVaultDocId(e.target.value)}
                    className="w-full border border-stone-200 rounded px-3 py-2 bg-stone-50 text-xs focus:border-brand-deep-sage outline-none"
                    required
                  >
                    {vaultDocuments.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.document_name || doc.title || doc.original_filename} ({doc.document_category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Application Document Category Tag
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full border border-stone-200 rounded px-3 py-2 bg-stone-50 text-xs focus:border-brand-deep-sage outline-none"
                  >
                    <option value="ENVIRONMENTAL_CLEARANCE">Environmental Clearance (CTE / CTO)</option>
                    <option value="UDYAM_REGISTRATION">Udyam Registration Certificate</option>
                    <option value="DETAILED_PROJECT_REPORT">Detailed Project Report (DPR)</option>
                    <option value="LAND_TITLE_DEED">Land Title / Industrial Lease</option>
                    <option value="BANK_SANCTION_LETTER">Bank Term Loan Sanction Letter</option>
                    <option value="CA_EXPENDITURE_CERTIFICATE">Chartered Accountant Expenditure Certificate</option>
                    <option value="GENERAL_COMPLIANCE">General Compliance Document</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVaultModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={attachingDoc}
                    className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4"
                  >
                    {attachingDoc ? 'Attaching...' : 'Attach Document'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
