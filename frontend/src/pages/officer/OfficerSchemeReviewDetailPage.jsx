import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
  Clock,
  User,
  HelpCircle,
  Send,
  MessageSquare,
  Lock,
  ChevronRight,
  RefreshCw,
  FileCheck,
  Shield,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { officerSchemeReviewAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OfficerSchemeReviewDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState('');

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeDecision, setCompleteDecision] = useState('INTERNAL_VERIFIED');
  const [completeRemarks, setCompleteRemarks] = useState('');

  const [showReferModal, setShowReferModal] = useState(false);
  const [referRemarks, setReferRemarks] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await officerSchemeReviewAPI.getDetail(id);
      if (res.data?.success) {
        setDossier(res.data.data?.dossier || null);
      }
    } catch (err) {
      console.error('Failed to load review detail:', err);
      setError(err.response?.data?.error?.message || 'Failed to load scheme review detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAssignToMe = async () => {
    try {
      setActionLoading(true);
      await officerSchemeReviewAPI.assignReview(id, {
        remarks: 'Self-assigned by department officer for technical scrutiny.'
      });
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to assign review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    try {
      setActionLoading(true);
      await officerSchemeReviewAPI.startReview(id, {
        remarks: 'Scrutiny initiated: verifying enterprise profile and financial claims against policy rules.'
      });
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestClarification = async (e) => {
    e.preventDefault();
    if (!clarificationQuestion.trim()) return;
    try {
      setActionLoading(true);
      await officerSchemeReviewAPI.requestClarification(id, {
        question: clarificationQuestion.trim()
      });
      setShowClarificationModal(false);
      setClarificationQuestion('');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to request clarification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteReview = async (e) => {
    e.preventDefault();
    if (!completeRemarks.trim()) return;
    try {
      setActionLoading(true);
      await officerSchemeReviewAPI.completeReview(id, {
        decision: completeDecision,
        remarks: completeRemarks.trim()
      });
      setShowCompleteModal(false);
      setCompleteRemarks('');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to complete review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReferManual = async (e) => {
    e.preventDefault();
    if (!referRemarks.trim()) return;
    try {
      setActionLoading(true);
      await officerSchemeReviewAPI.referForManualReview(id, {
        remarks: referRemarks.trim()
      });
      setShowReferModal(false);
      setReferRemarks('');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to refer review.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'ASSIGNED':
        return <Badge variant="info">Assigned</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="primary">Under Scrutiny</Badge>;
      case 'CLARIFICATION_REQUESTED':
        return <Badge variant="warning">Clarification Requested</Badge>;
      case 'APPLICANT_RESPONSE_RECEIVED':
        return <Badge variant="success">Applicant Response Received</Badge>;
      case 'REVIEW_COMPLETED':
        return <Badge variant="success">Review Completed</Badge>;
      case 'REFERRED_FOR_MANUAL_REVIEW':
        return <Badge variant="secondary">Referred for Manual Review</Badge>;
      case 'REVIEW_WITHDRAWN':
        return <Badge variant="danger">Withdrawn</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-deep-sage" />
        <p className="text-xs text-stone-500">Loading scheme scrutiny workspace...</p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <div className="text-base font-bold text-brand-charcoal">{error || 'Review dossier not found.'}</div>
        <Link to="/officer/scheme-reviews">
          <Button variant="outline" size="sm">Back to Scrutiny Queue</Button>
        </Link>
      </div>
    );
  }

  const reviewStatus = dossier.review_status || 'PENDING_REVIEW';
  const isAssignedToMe = dossier.assigned_officer_id && (dossier.assigned_officer_id === user?.id || dossier.assigned_officer_email === user?.email);
  const scheme = dossier.scheme_detail || {};
  const business = dossier.business_detail || {};
  const location = dossier.location_detail || {};
  const attachedDocs = dossier.attached_vault_documents || [];
  const clarifications = dossier.clarifications || [];
  const auditHistory = dossier.audit_history || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          to="/officer/scheme-reviews"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-brand-deep-sage transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Scrutiny Desk Queue</span>
        </Link>
      </div>

      {/* Prototype Non-Statutory Disclaimer Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">SIH26130 PROTOTYPE ADMINISTRATIVE SCRUTINY NOTICE:</span> This evaluation workspace represents an internal BizPermit administrative review. Decisions, verification tags, and discrepancies recorded here do <span className="underline font-semibold">NOT</span> constitute a statutory government sanction, financial clearance, or legal approval under Central or State law.
          </div>
        </div>
      </div>

      {/* Workspace Header */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-stone-400">APPLICATION DOSSIER</span>
            <span className="text-xl font-bold font-mono text-brand-charcoal">{dossier.application_reference}</span>
            {getStatusBadge(reviewStatus)}
          </div>
          <h1 className="text-lg font-bold text-stone-800 mt-1">
            {scheme.name || dossier.scheme_code}
          </h1>
          <div className="flex items-center gap-4 text-xs text-stone-500 mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-stone-400" />
              <strong className="text-stone-700">{business.legal_name || 'Enterprise'}</strong>
            </span>
            <span>•</span>
            <span>Jurisdiction: <strong className="text-stone-700">{dossier.state_code}</strong></span>
            <span>•</span>
            <span>Department: <strong className="text-stone-700">{dossier.department_code}</strong></span>
            <span>•</span>
            <span>Created: {new Date(dossier.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {(!dossier.assigned_officer_id || reviewStatus === 'PENDING_REVIEW') && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignToMe}
              disabled={actionLoading}
              className="text-xs"
            >
              Pick Up Review
            </Button>
          )}

          {(reviewStatus === 'ASSIGNED' || reviewStatus === 'APPLICANT_RESPONSE_RECEIVED') && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartReview}
              disabled={actionLoading}
              className="text-xs"
            >
              Start Technical Scrutiny
            </Button>
          )}

          {reviewStatus === 'UNDER_REVIEW' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClarificationModal(true)}
                disabled={actionLoading}
                className="text-xs"
              >
                Request Clarification
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReferModal(true)}
                disabled={actionLoading}
                className="text-xs"
              >
                Refer to Senior
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCompleteModal(true)}
                disabled={actionLoading}
                className="text-xs"
              >
                Complete Evaluation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Completed Decision Card if Finalized */}
      {dossier.review_decision && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Administrative Evaluation Completed: {dossier.review_decision.decision}</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            {dossier.review_decision.remarks}
          </p>
          <div className="text-[10px] text-emerald-700 mt-2 font-mono">
            Evaluated by {dossier.review_decision.officer_email} on {new Date(dossier.review_decision.timestamp).toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200">
            {dossier.review_decision.prototype_disclaimer}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dossier Details & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enterprise & Facility Profile */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Building2 className="h-4 w-4 text-brand-deep-sage" />
              <h2 className="text-sm font-bold text-brand-charcoal">Enterprise & Facility Profile</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Legal Name</span>
                <span className="font-semibold text-stone-800">{business.legal_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">PAN</span>
                <span className="font-mono font-semibold text-stone-800">{business.pan || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Udyam Registration</span>
                <span className="font-mono font-semibold text-stone-800">{business.udyam_registration_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Business Location</span>
                <span className="font-semibold text-stone-800">{location.location_name || 'Business Location'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Pollution Category</span>
                <span className="font-semibold text-stone-800">{location.industrial_profile?.pollution_category || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Sector</span>
                <span className="font-semibold text-stone-800">{location.industrial_profile?.sector || business.industry_sector || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Dossier Financial & Investment Claims */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <FileCheck className="h-4 w-4 text-brand-deep-sage" />
              <h2 className="text-sm font-bold text-brand-charcoal">Applicant Claim Dossier</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Claimed Project Cost</span>
                <span className="font-bold text-stone-800">
                  {dossier.dossier_data?.project_cost_inr ? `₹${(dossier.dossier_data.project_cost_inr / 100000).toFixed(2)} Lakhs` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Eligible Plant/Machinery</span>
                <span className="font-bold text-stone-800">
                  {dossier.dossier_data?.claimed_eligible_investment_inr ? `₹${(dossier.dossier_data.claimed_eligible_investment_inr / 100000).toFixed(2)} Lakhs` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Employment Generation</span>
                <span className="font-bold text-stone-800">{dossier.dossier_data?.employment_generation || 'N/A'} personnel</span>
              </div>
            </div>

            {dossier.external_submission && (
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
                <span className="font-bold text-stone-700 block">External Portal Self-Attestation</span>
                <div className="text-stone-600">
                  Submitted on <strong>{dossier.external_submission.external_portal_name}</strong> with Ack Number: <strong>{dossier.external_submission.external_acknowledgement_number}</strong> on {dossier.external_submission.external_submission_date}.
                </div>
              </div>
            )}
          </div>

          {/* Attached Document Vault Files with Signed Previews */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="h-4 w-4 text-brand-deep-sage" />
                <h2 className="text-sm font-bold text-brand-charcoal">Attached Evidence Documents ({attachedDocs.length})</h2>
              </div>
              <span className="text-[10px] font-mono text-stone-400">15-Minute Signed URLs</span>
            </div>

            {attachedDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 italic">
                No vault documents attached to this dossier.
              </div>
            ) : (
              <div className="space-y-2">
                {attachedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                    <div>
                      <div className="font-semibold text-stone-800">{doc.file_name || doc.document_category}</div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{doc.document_category}</span>
                        {doc.file_size && <span>• {(doc.file_size / 1024).toFixed(1)} KB</span>}
                        {doc.document_integrity_sha256 && (
                          <span className="font-mono text-stone-400 truncate max-w-[120px]" title={doc.document_integrity_sha256}>
                            • SHA: {doc.document_integrity_sha256.substring(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {doc.signed_preview_url ? (
                        <a
                          href={doc.signed_preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-stone-300 rounded text-stone-700 hover:bg-stone-100 text-[11px] font-medium transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Secure Viewer</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">Storage preview unavailable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clarification Loop Thread */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-brand-amber" />
                <h2 className="text-sm font-bold text-brand-charcoal">Clarification Inquiries ({clarifications.length})</h2>
              </div>
            </div>

            {clarifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 italic">
                No formal clarifications raised for this review dossier.
              </div>
            ) : (
              <div className="space-y-4">
                {clarifications.map((clr, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-brand-deep-sage">{clr.clarification_id}</span>
                      <span className="text-stone-400 text-[10px]">{new Date(clr.created_at).toLocaleString()}</span>
                    </div>

                    <div className="text-xs text-stone-800">
                      <strong className="text-stone-500 block text-[10px] uppercase font-mono">Officer Question:</strong>
                      <p className="mt-0.5">{clr.question}</p>
                    </div>

                    {clr.applicant_response ? (
                      <div className="bg-emerald-50/60 p-3 rounded border border-emerald-200 text-xs space-y-1">
                        <strong className="text-emerald-900 block text-[10px] uppercase font-mono">Applicant Response:</strong>
                        <p className="text-emerald-800">{clr.applicant_response}</p>
                        <span className="text-[10px] text-emerald-600 block">
                          Responded on {new Date(clr.responded_at).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-700 flex items-center gap-1 italic">
                        <Clock className="h-3 w-3" />
                        <span>Awaiting applicant response...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scrutiny Audit Ledger & Scheme Metadata */}
        <div className="space-y-6">
          {/* Scheme Statutory Profile */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-brand-charcoal border-b border-stone-100 pb-2 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-brand-deep-sage" />
              <span>Governing Scheme Rules</span>
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Scheme Code</span>
                <span className="font-mono font-bold text-stone-800">{dossier.scheme_code}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Financial Instrument</span>
                <span className="font-semibold text-stone-800">{scheme.financial_instrument_type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Fresh Intake Status</span>
                <Badge variant={scheme.fresh_intake_status === 'OPEN' ? 'success' : 'warning'}>
                  {scheme.fresh_intake_status || 'N/A'}
                </Badge>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-mono">Rule Version</span>
                <span className="font-mono text-stone-700">{dossier.scheme_rule_version}</span>
              </div>
            </div>
          </div>

          {/* Immutable Audit Trail */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-bold text-brand-charcoal flex items-center gap-1.5 text-xs">
                <Clock className="h-4 w-4 text-brand-deep-sage" />
                <span>Immutable Audit Trail ({auditHistory.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-stone-400">Append-Only</span>
            </div>

            {auditHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 italic">
                No audit entries recorded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {auditHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-deep-sage">{item.action}</span>
                      <span className="text-[10px] text-stone-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-stone-700">{item.remarks}</div>
                    <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1 border-t border-stone-200/50">
                      <span>{item.actor_email}</span>
                      <span className="font-mono uppercase">{item.actor_role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clarification Modal */}
      {showClarificationModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Request Technical Clarification</h3>
            <p className="text-xs text-stone-500">
              Submit a formal technical question to the applicant. The applicant will be notified and can provide answers along with attached vault documents.
            </p>
            <form onSubmit={handleRequestClarification} className="space-y-4">
              <textarea
                rows={4}
                required
                placeholder="State your technical query or document requirement clearly..."
                value={clarificationQuestion}
                onChange={(e) => setClarificationQuestion(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowClarificationModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Dispatching...' : 'Dispatch Inquiry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Review Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Complete Administrative Evaluation</h3>
            <p className="text-xs text-stone-500">
              Record the final internal administrative review outcome. All decisions carry the mandatory SIH26130 prototype notice.
            </p>
            <form onSubmit={handleCompleteReview} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Decision Outcome</label>
                <select
                  value={completeDecision}
                  onChange={(e) => setCompleteDecision(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
                >
                  <option value="INTERNAL_VERIFIED">INTERNAL_VERIFIED — Claims match criteria</option>
                  <option value="DISCREPANCIES_NOTED">DISCREPANCIES_NOTED — Irregularities identified</option>
                  <option value="INTERNAL_REJECTED">INTERNAL_REJECTED — Ineligible / Non-compliant</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Scrutiny Summary & Remarks</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summarize evaluation findings, document checks, and audit notes..."
                  value={completeRemarks}
                  onChange={(e) => setCompleteRemarks(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
                />
              </div>

              <div className="bg-stone-50 p-2.5 rounded border border-stone-200 text-[10px] text-stone-500">
                Notice attached to decision: <em className="text-stone-700">"BizPermit Prototype - SIH26130: Internal administrative evaluation under SIH26130. Does NOT constitute a statutory government sanction, clearance, or subsidy release."</em>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Finalizing...' : 'Finalize Scrutiny'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refer Modal */}
      {showReferModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Refer for Senior / Manual Review</h3>
            <p className="text-xs text-stone-500">
              Escalate this dossier to the senior divisional committee for manual scrutiny or policy interpretation.
            </p>
            <form onSubmit={handleReferManual} className="space-y-4">
              <textarea
                rows={4}
                required
                placeholder="State technical escalation rationale or policy ambiguity..."
                value={referRemarks}
                onChange={(e) => setReferRemarks(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReferModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Referring...' : 'Refer Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default OfficerSchemeReviewDetailPage;
