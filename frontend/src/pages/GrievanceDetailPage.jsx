import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { grievancesAPI, documentVaultAPI } from '../services/api';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Star,
  RotateCcw,
  Ban,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  UserCheck,
} from 'lucide-react';

export const GrievanceDetailPage = () => {
  const { id } = useParams();
  const [grievance, setGrievance] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Clarification Response
  const [activeClarificationId, setActiveClarificationId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingClarification, setSubmittingClarification] = useState(false);

  // Feedback Form
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Reopen & Withdraw Modals
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await grievancesAPI.get(id);
      setGrievance(res.data?.data?.grievance || null);
      setAuditHistory(res.data?.data?.audit_history || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load grievance details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleClarificationSubmit = async (cId) => {
    if (!responseText.trim()) return;
    try {
      setSubmittingClarification(true);
      await grievancesAPI.respondClarification(id, {
        clarification_id: cId,
        response_text: responseText.trim(),
      });
      setActionMsg('Clarification response submitted successfully.');
      setActiveClarificationId(null);
      setResponseText('');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit response.');
    } finally {
      setSubmittingClarification(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      await grievancesAPI.feedback(id, {
        rating,
        feedback_text: feedbackText.trim(),
      });
      setActionMsg('Thank you for submitting satisfaction feedback.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    try {
      await grievancesAPI.reopen(id, { reason: reopenReason.trim() });
      setShowReopenModal(false);
      setActionMsg('Grievance reopened for administrative review.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reopen grievance.');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawReason.trim()) return;
    try {
      await grievancesAPI.withdraw(id, { reason: withdrawReason.trim() });
      setShowWithdrawModal(false);
      setActionMsg('Grievance marked as withdrawn.');
      fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to withdraw grievance.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Clock className="w-8 h-8 text-brand-deep-sage animate-spin mx-auto mb-3" />
        <p className="text-xs text-stone-500">Loading grievance detail...</p>
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-800">Grievance Not Found</h2>
        <Link to="/grievances" className="text-xs text-brand-deep-sage hover:underline mt-2 inline-block">
          Return to grievances list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link
        to="/grievances"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-brand-deep-sage transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Grievances
      </Link>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Main Grievance Header */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-brand-deep-sage">{grievance.grievance_reference}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-pale-sage text-brand-deep-sage border border-brand-deep-sage/20">
                {grievance.status}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                Priority: {grievance.priority}
              </span>
              {grievance.escalation_level && grievance.escalation_level !== 'LEVEL_1' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                  {grievance.escalation_level}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-brand-charcoal mt-2">{grievance.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            {grievance.status === 'RESOLVED' && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen
              </button>
            )}
            {!['RESOLVED', 'CLOSED', 'WITHDRAWN'].includes(grievance.status) && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition"
              >
                <Ban className="w-3.5 h-3.5" />
                Withdraw
              </button>
            )}
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-lg text-xs">
          <div>
            <div className="text-stone-400 text-[11px]">Department</div>
            <div className="font-semibold text-stone-700 mt-0.5">{grievance.department_code}</div>
          </div>
          <div>
            <div className="text-stone-400 text-[11px]">Jurisdiction</div>
            <div className="font-semibold text-stone-700 mt-0.5">{grievance.state_code}</div>
          </div>
          <div>
            <div className="text-stone-400 text-[11px]">Category</div>
            <div className="font-semibold text-stone-700 mt-0.5">{grievance.category_code}</div>
          </div>
          <div>
            <div className="text-stone-400 text-[11px]">Internal SLA Target</div>
            <div className="font-semibold text-brand-amber mt-0.5">
              {grievance.internal_target_date
                ? new Date(grievance.internal_target_date).toLocaleDateString()
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Assigned Scrutiny Officer Card */}
        {grievance.assigned_officer_name && (
          <div className="p-3.5 bg-brand-pale-sage/50 rounded-lg border border-brand-deep-sage/30 text-xs text-brand-deep-sage flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-brand-deep-sage shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-stone-900 text-sm">
                Assigned Scrutiny Officer: {grievance.assigned_officer_name}
              </div>
              <div className="text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Official Email: <strong className="font-mono text-stone-800">{grievance.assigned_officer_email}</strong></span>
                {grievance.assigned_officer_department && (
                  <span>Department: <strong>{grievance.assigned_officer_department}</strong></span>
                )}
                {grievance.assigned_officer_badge && (
                  <span>Badge: #{grievance.assigned_officer_badge}</span>
                )}
              </div>
              {grievance.assigned_at && (
                <div className="text-[10px] text-stone-500 font-mono">
                  Assigned on {new Date(grievance.assigned_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-stone-700">Detailed Statement</div>
          <p className="text-xs text-stone-600 leading-relaxed bg-white p-3 rounded-lg border border-stone-100">
            {grievance.description}
          </p>
        </div>

        {/* Supporting Documents */}
        {grievance.attached_documents && grievance.attached_documents.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="text-xs font-semibold text-stone-700">Attached Vault Documents</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {grievance.attached_documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-brand-deep-sage shrink-0" />
                    <span className="font-medium text-stone-700 truncate">{doc.document_name}</span>
                  </div>
                  {doc.signed_preview_url ? (
                    <a
                      href={doc.signed_preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold text-brand-deep-sage bg-white border border-stone-200 rounded hover:bg-stone-100 transition shrink-0"
                    >
                      View (15 min)
                    </a>
                  ) : (
                    <span className="text-[10px] text-stone-400">Vault Protected</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clarification Section */}
      {grievance.clarifications && grievance.clarifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-600" />
            Clarification Queries & Responses
          </h2>
          <div className="space-y-4">
            {grievance.clarifications.map((c) => (
              <div
                key={c.clarification_id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3 text-xs"
              >
                {/* Officer Question */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">
                        Query by {c.officer_name || c.officer_email}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(c.requested_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                      {c.question}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      c.status === 'RESPONDED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Applicant Response */}
                {c.applicant_response ? (
                  <div className="pl-4 border-l-2 border-brand-deep-sage space-y-1">
                    <div className="text-[11px] font-semibold text-brand-deep-sage">
                      Your Response ({new Date(c.responded_at).toLocaleString()}):
                    </div>
                    <p className="text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                      {c.applicant_response}
                    </p>
                  </div>
                ) : activeClarificationId === c.clarification_id ? (
                  <div className="space-y-3 pt-2">
                    <textarea
                      rows={3}
                      placeholder="Type your response to the officer's query..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-deep-sage bg-white"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setActiveClarificationId(null);
                          setResponseText('');
                        }}
                        className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleClarificationSubmit(c.clarification_id)}
                        disabled={submittingClarification}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-deep-sage hover:bg-brand-charcoal rounded-lg shadow-sm transition disabled:opacity-50"
                      >
                        {submittingClarification ? 'Submitting...' : 'Submit Clarification'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveClarificationId(c.clarification_id)}
                    className="px-3 py-1.5 text-xs font-semibold text-brand-deep-sage bg-white border border-brand-deep-sage/30 hover:bg-brand-pale-sage/40 rounded-lg transition"
                  >
                    Respond to Clarification
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Details & Feedback Form */}
      {grievance.resolution_details && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Formal Administrative Resolution Record
          </div>
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs space-y-2">
            <div className="font-semibold text-emerald-900">
              Resolved by {grievance.resolution_details.resolved_by_officer_email} on{' '}
              {new Date(grievance.resolution_details.resolved_at).toLocaleString()}
            </div>
            <p className="text-stone-700 leading-relaxed">
              {grievance.resolution_details.resolution_summary}
            </p>
            {grievance.resolution_details.corrective_actions?.length > 0 && (
              <div className="pt-2">
                <div className="font-semibold text-stone-700 mb-1">Corrective Measures Dispatch:</div>
                <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                  {grievance.resolution_details.corrective_actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[10px] text-stone-400 pt-2 border-t border-emerald-200/40">
              {grievance.resolution_details.prototype_disclaimer}
            </div>
          </div>

          {/* Satisfaction Feedback Section */}
          {grievance.status === 'RESOLVED' && !grievance.feedback && (
            <form onSubmit={handleFeedbackSubmit} className="pt-4 border-t border-stone-200 space-y-3">
              <h3 className="text-xs font-bold text-brand-charcoal">Submit Redressal Satisfaction Rating</h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-stone-600 ml-2">{rating} / 5 Stars</span>
              </div>
              <textarea
                rows={2}
                placeholder="Optional feedback remarks on resolution timeliness or officer assistance..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-deep-sage"
              />
              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-deep-sage hover:bg-brand-charcoal rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Satisfaction Rating'}
              </button>
            </form>
          )}

          {grievance.feedback && (
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-stone-700">Your Feedback:</span>{' '}
                <span className="text-stone-600">{grievance.feedback.feedback_text || 'No remarks provided.'}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{grievance.feedback.rating} / 5</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Public Audit Trail */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-500" />
          Public Lifecycle History
        </h2>
        <div className="space-y-3">
          {auditHistory.map((item, idx) => (
            <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-stone-800">{item.action}</div>
                <div className="text-stone-600">{item.remarks}</div>
                <div className="text-[11px] text-stone-400">Actor: {item.actor_email} ({item.actor_role})</div>
              </div>
              <div className="text-[11px] text-stone-400 shrink-0">
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Reopen Grievance</h3>
            <p className="text-xs text-stone-500">
              Please specify why the proposed resolution does not satisfactorily address your concern.
            </p>
            <textarea
              rows={3}
              placeholder="State clear reasons for dissatisfaction..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-deep-sage"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Withdraw Grievance</h3>
            <p className="text-xs text-stone-500">
              Withdrawing will permanently close administrative processing for this grievance.
            </p>
            <textarea
              rows={2}
              placeholder="Reason for withdrawal (e.g. resolved amicably out of band)..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-200 rounded-lg focus:ring-1 focus:ring-brand-deep-sage"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
