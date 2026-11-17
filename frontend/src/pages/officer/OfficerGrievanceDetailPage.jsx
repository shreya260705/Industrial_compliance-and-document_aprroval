import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
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
  Shield,
  Layers,
  Sparkles,
  Info,
  Check,
  X,
  FileCheck,
  FolderArchive,
  ArrowUpRight
} from 'lucide-react';
import { officerGrievancesAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OfficerGrievanceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();

  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Modals
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [clarificationDueDays, setClarificationDueDays] = useState(5);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionType, setResolutionType] = useState('RESOLVED_FAVORABLE');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateTargetLevel, setEscalateTargetLevel] = useState('LEVEL_2');
  const [escalateReason, setEscalateReason] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await officerGrievancesAPI.getDetail(id);
      if (res.data?.success) {
        setGrievance(res.data.data?.grievance || null);
      }
    } catch (err) {
      console.error('Failed to load grievance detail:', err);
      setError(err.response?.data?.error?.message || 'Failed to load grievance scrutiny record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSelfAssign = async () => {
    try {
      setActionLoading(true);
      await officerGrievancesAPI.selfAssign(id, {
        assignee_notes: 'Self-assigned by jurisdictional scrutiny officer.'
      });
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to self-assign grievance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    try {
      setActionLoading(true);
      await officerGrievancesAPI.startReview(id, {
        remarks: 'Scrutiny initiated: examining documentary evidence and departmental records.'
      });
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      setActionLoading(true);
      await officerGrievancesAPI.addNote(id, {
        note: noteText.trim(),
        is_confidential: true
      });
      setNoteText('');
      setShowNoteModal(false);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save confidential internal note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestClarification = async (e) => {
    e.preventDefault();
    if (!clarificationQuestion.trim()) return;
    try {
      setActionLoading(true);
      await officerGrievancesAPI.requestClarification(id, {
        question: clarificationQuestion.trim(),
        category: 'EVIDENCE_REQUEST',
        due_days: Number(clarificationDueDays) || 5
      });
      setClarificationQuestion('');
      setShowClarificationModal(false);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to request clarification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim() || !actionsTaken.trim()) {
      alert('Please provide both resolution summary and actions taken.');
      return;
    }
    try {
      setActionLoading(true);
      await officerGrievancesAPI.resolve(id, {
        resolution_type: resolutionType,
        resolution_summary: resolutionSummary.trim(),
        actions_taken: actionsTaken.trim(),
        preventive_measures: preventiveMeasures.trim() || undefined,
        closure_remarks: 'Formal resolution passed under prototype adjudication workflow.'
      });
      setShowResolveModal(false);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to record resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason.trim()) {
      alert('Please provide an escalation justification.');
      return;
    }
    try {
      setActionLoading(true);
      await officerGrievancesAPI.escalate(id, {
        target_level: escalateTargetLevel,
        reason: escalateReason.trim()
      });
      setShowEscalateModal(false);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to escalate grievance.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      SUBMITTED: { label: 'Submitted', variant: 'warning' },
      TRIAGED: { label: 'Triaged', variant: 'info' },
      ASSIGNED: { label: 'Assigned', variant: 'primary' },
      UNDER_INVESTIGATION: { label: 'Under Investigation', variant: 'primary' },
      CLARIFICATION_REQUESTED: { label: 'Clarification Requested', variant: 'warning' },
      REFERRED_FOR_ESCALATION: { label: 'Referred for Escalation', variant: 'danger' },
      ESCALATED_L2: { label: 'Escalated L2 (State)', variant: 'danger' },
      ESCALATED_L3: { label: 'Escalated L3 (Admin)', variant: 'danger' },
      RESOLVED: { label: 'Resolved', variant: 'success' },
      CLOSED: { label: 'Closed', variant: 'default' },
      REOPENED: { label: 'Reopened', variant: 'warning' },
      WITHDRAWN: { label: 'Withdrawn', variant: 'default' }
    };
    const s = map[status] || { label: status, variant: 'default' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      URGENT: { label: 'URGENT', variant: 'danger' },
      HIGH: { label: 'HIGH', variant: 'warning' },
      MEDIUM: { label: 'MEDIUM', variant: 'info' },
      LOW: { label: 'LOW', variant: 'default' }
    };
    const p = map[priority] || { label: priority, variant: 'default' };
    return <Badge variant={p.variant}>{p.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{error || 'Grievance record not found.'}</span>
          </div>
          <Link to="/officer/grievances">
            <Button variant="outline" size="sm">Back to Queue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAssigned = !!grievance.assigned_officer_id;
  const isAssignedToMe = String(grievance.assigned_officer_id) === String(user?.id);
  const canStartReview = isAssignedToMe && grievance.status === 'ASSIGNED';
  const canAct = (isAssignedToMe || isSuperAdmin) && !['RESOLVED', 'CLOSED', 'WITHDRAWN'].includes(grievance.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link to="/officer/grievances" className="hover:text-primary-600 flex items-center">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Grievance Queue
            </Link>
            <span>/</span>
            <span className="font-mono text-gray-700">{grievance.grievance_id}</span>
          </div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{grievance.title}</h1>
            {getStatusBadge(grievance.status)}
            {getPriorityBadge(grievance.priority)}
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {!isAssigned && (
            <Button
              onClick={handleSelfAssign}
              disabled={actionLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <User className="h-4 w-4 mr-1.5" /> Self-Assign to Me
            </Button>
          )}

          {canStartReview && (
            <Button
              onClick={handleStartReview}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <FileCheck className="h-4 w-4 mr-1.5" /> Begin Scrutiny
            </Button>
          )}

          {canAct && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowClarificationModal(true)}
                disabled={actionLoading}
              >
                <HelpCircle className="h-4 w-4 mr-1.5 text-blue-600" /> Query Applicant
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowNoteModal(true)}
                disabled={actionLoading}
              >
                <Lock className="h-4 w-4 mr-1.5 text-gray-500" /> Internal Note
              </Button>

              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowEscalateModal(true)}
                disabled={actionLoading}
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Escalate
              </Button>

              <Button
                onClick={() => setShowResolveModal(true)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Pass Resolution
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" onClick={fetchDetail} disabled={actionLoading}>
            <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statutory Prototype Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900">
              Statutory Scrutiny Notice & Prototype Disclaimer (SIH26130)
            </p>
            <p>
              This grievance scrutiny portal provides technical workflow tracking and internal case management.
              Formal quasi-judicial redressal decisions remain subject to the administrative authority and governing statutes of the respective department.
              Gujarat Single Window Act Section 16(2) governs appellate escalation timelines; no blanket statutory resolution timeline applies.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {grievance.track === 'TRACK_A_INTERNAL' ? 'Track A: BizPermit Platform' : 'Track B: Statutory Department'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{grievance.category_code}</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-purple-500">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jurisdiction & Dept</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
            {grievance.department_name || grievance.department_code || 'General Portal'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{grievance.state || 'All-India Scope'}</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Scrutinizer</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
            {grievance.assigned_officer_name || 'Unassigned'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Level: {grievance.escalation_level || 'LEVEL_1'}
          </div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-teal-500">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target SLA</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {grievance.sla_target_hours ? `${grievance.sla_target_hours} Hours Target` : 'Standard SLA'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Submitted: {grievance.submitted_at ? new Date(grievance.submitted_at).toLocaleDateString() : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'details'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Complaint & Evidence</span>
          </button>

          <button
            onClick={() => setActiveTab('clarifications')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'clarifications'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Applicant Clarifications ({grievance.clarifications?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('internal_notes')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'internal_notes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Internal Scrutiny Notes ({grievance.internal_notes?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('resolution')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'resolution'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Formal Adjudication</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'audit'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Audit Trail ({grievance.audit_trail?.length || 0})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Details & Evidence */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Applicant Statement of Grievance</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border">
                {grievance.description}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-xs">
                <div>
                  <span className="text-gray-500">Incident Date:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {grievance.incident_date || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Industrial Facility:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {grievance.facility_name || 'All-Facility / Enterprise Level'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Uploaded Supporting Evidence</h3>
              {grievance.attachments && grievance.attachments.length > 0 ? (
                <div className="space-y-3">
                  {grievance.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{att.name || att.document_id}</div>
                          <div className="text-xs text-gray-500">
                            Vault Doc ID: <span className="font-mono">{att.document_id}</span>
                            {att.size && ` • ${(att.size / 1024).toFixed(1)} KB`}
                          </div>
                        </div>
                      </div>
                      {att.file_url && (
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline flex items-center font-medium"
                        >
                          View Document <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg border border-dashed">
                  No documentary attachments provided with this grievance.
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Enterprise & Jurisdiction
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Enterprise ID</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{grievance.enterprise_id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Applicant User ID</dt>
                  <dd className="font-mono text-gray-900 mt-0.5">{grievance.applicant_id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Assigned Department</dt>
                  <dd className="text-gray-900 mt-0.5">{grievance.department_name || grievance.department_code || 'General'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Jurisdiction State</dt>
                  <dd className="text-gray-900 mt-0.5">{grievance.state || 'National / Center'}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Redressal Timeline
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted:</span>
                  <span className="font-medium text-gray-900">
                    {grievance.submitted_at ? new Date(grievance.submitted_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned:</span>
                  <span className="font-medium text-gray-900">
                    {grievance.assigned_at ? new Date(grievance.assigned_at).toLocaleString() : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolved:</span>
                  <span className="font-medium text-gray-900">
                    {grievance.resolved_at ? new Date(grievance.resolved_at).toLocaleString() : 'Open'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Closed:</span>
                  <span className="font-medium text-gray-900">
                    {grievance.closed_at ? new Date(grievance.closed_at).toLocaleString() : 'Open'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Clarifications */}
      {activeTab === 'clarifications' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Official Clarification Loop</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Statutory requests for evidence, missing filings, or supplemental clarification sent to applicant.
              </p>
            </div>
            {canAct && (
              <Button
                size="sm"
                onClick={() => setShowClarificationModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <HelpCircle className="h-4 w-4 mr-1.5" /> Request Clarification
              </Button>
            )}
          </div>

          {grievance.clarifications && grievance.clarifications.length > 0 ? (
            <div className="space-y-4">
              {grievance.clarifications.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 border-b pb-2">
                    <span className="font-semibold text-primary-700">Query #{idx + 1}</span>
                    <span>Asked on: {new Date(item.requested_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">{item.question}</div>

                  {item.response ? (
                    <div className="mt-3 bg-white p-3 rounded border-l-4 border-l-green-500 text-xs">
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="font-semibold text-green-700">Applicant Response</span>
                        <span>{new Date(item.responded_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{item.response}</p>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Pending response from applicant (Due in {item.due_days || 5} days)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-8">
              No clarification queries raised for this grievance yet.
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Internal Notes */}
      {activeTab === 'internal_notes' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">Confidential Scrutiny Notes</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Internal departmental commentary visible ONLY to assigned officers and Super Admins. Never disclosed to applicants.
              </p>
            </div>
            {canAct && (
              <Button
                size="sm"
                onClick={() => setShowNoteModal(true)}
                className="bg-gray-800 hover:bg-gray-900 text-white"
              >
                <Lock className="h-4 w-4 mr-1.5" /> Add Internal Note
              </Button>
            )}
          </div>

          {grievance.internal_notes && grievance.internal_notes.length > 0 ? (
            <div className="space-y-3">
              {grievance.internal_notes.map((note, idx) => (
                <div key={idx} className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-gray-500 border-b border-amber-100 pb-1.5">
                    <span className="font-semibold text-gray-800 flex items-center">
                      <Lock className="h-3 w-3 mr-1 text-amber-600" /> Officer: {note.officer_name || note.officer_id}
                    </span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap text-sm">{note.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-8">
              No internal confidential notes recorded.
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Resolution & Adjudication */}
      {activeTab === 'resolution' && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-base font-semibold text-gray-900">Formal Resolution Record</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Official adjudication outcome, remedial actions, and preventive compliance directives.
            </p>
          </div>

          {grievance.resolution ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-bold text-green-900">
                      Outcome: {grievance.resolution.resolution_type || 'RESOLVED'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {grievance.resolved_at ? new Date(grievance.resolved_at).toLocaleString() : ''}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-green-800 uppercase">Resolution Summary</h4>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {grievance.resolution.resolution_summary}
                  </p>
                </div>
                {grievance.resolution.actions_taken && (
                  <div className="pt-2 border-t border-green-200">
                    <h4 className="text-xs font-semibold text-green-800 uppercase">Actions Taken</h4>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                      {grievance.resolution.actions_taken}
                    </p>
                  </div>
                )}
                {grievance.resolution.preventive_measures && (
                  <div className="pt-2 border-t border-green-200">
                    <h4 className="text-xs font-semibold text-green-800 uppercase">Preventive Measures</h4>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                      {grievance.resolution.preventive_measures}
                    </p>
                  </div>
                )}
              </div>

              {/* Applicant Feedback */}
              {grievance.feedback && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-blue-900 uppercase">Applicant Redressal Rating</h4>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-lg font-bold text-blue-700">
                      {'★'.repeat(grievance.feedback.rating)}{'☆'.repeat(5 - grievance.feedback.rating)}
                    </span>
                    <span className="text-sm font-medium text-gray-700">({grievance.feedback.rating}/5)</span>
                  </div>
                  {grievance.feedback.comments && (
                    <p className="text-xs text-gray-700 mt-1 italic">"{grievance.feedback.comments}"</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-4">This grievance has not yet reached formal adjudication.</p>
              {canAct && (
                <Button
                  onClick={() => setShowResolveModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Adjudicate & Pass Resolution
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Audit History */}
      {activeTab === 'audit' && (
        <Card className="p-6">
          <div className="border-b pb-4 mb-4">
            <h3 className="text-base font-semibold text-gray-900">Append-Only Audit Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tamper-evident statutory record of all state transitions, queries, reassignments, and rulings.
            </p>
          </div>

          {grievance.audit_trail && grievance.audit_trail.length > 0 ? (
            <div className="space-y-4">
              {grievance.audit_trail.map((entry, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs border-b pb-3 last:border-b-0">
                  <div className="h-2 w-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{entry.action}</span>
                      <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-600">
                      Performed by: <span className="font-medium text-gray-800">{entry.performed_by_name || entry.performed_by}</span>
                      {entry.from_status && entry.to_status && (
                        <span> • Status: <span className="font-mono">{entry.from_status}</span> &rarr; <span className="font-mono font-bold">{entry.to_status}</span></span>
                      )}
                    </div>
                    {entry.notes && <p className="text-gray-700 italic bg-gray-50 p-2 rounded">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-6">
              No audit trail records logged.
            </div>
          )}
        </Card>
      )}

      {/* Modal: Request Clarification */}
      {showClarificationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Request Clarification from Applicant</h3>
            <p className="text-xs text-gray-500">
              The applicant will receive an in-app notice and email to submit additional documentation or explanations.
            </p>
            <form onSubmit={handleRequestClarification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Specific Query / Requirement</label>
                <textarea
                  rows={4}
                  required
                  value={clarificationQuestion}
                  onChange={(e) => setClarificationQuestion(e.target.value)}
                  placeholder="Detail the exact document, clarification, or proof required from the applicant..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Response Window (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={clarificationDueDays}
                  onChange={(e) => setClarificationDueDays(e.target.value)}
                  className="w-24 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClarificationModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Query'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Confidential Internal Note */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-bold text-gray-900">Add Confidential Scrutiny Note</h3>
            </div>
            <p className="text-xs text-gray-500">
              This note is recorded strictly in departmental scrutiny records. It is never exposed to the enterprise applicant.
            </p>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record verification notes, preliminary findings, or internal department deliberations..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNoteModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gray-900 hover:bg-black text-white"
                >
                  {actionLoading ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Pass Resolution */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="p-6 max-w-2xl w-full bg-white space-y-4 my-8">
            <h3 className="text-lg font-bold text-gray-900">Pass Formal Redressal Resolution</h3>
            <p className="text-xs text-gray-500">
              Formally close the grievance by recording findings, remedial action, and preventive compliance measures.
            </p>
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adjudication Outcome</label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="RESOLVED_FAVORABLE">RESOLVED_FAVORABLE (Remedy Granted)</option>
                  <option value="RESOLVED_PARTIALLY_FAVORABLE">RESOLVED_PARTIALLY_FAVORABLE (Partial Relief)</option>
                  <option value="RESOLVED_REJECTED">RESOLVED_REJECTED (Grievance Dismissed on Merits)</option>
                  <option value="DISMISSED_INADMISSIBLE">DISMISSED_INADMISSIBLE (Inadmissible / Non-Compliant)</option>
                  <option value="REFERRED_TO_STATUTORY_AUTHORITY">REFERRED_TO_STATUTORY_AUTHORITY (Transferred to External Dept)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Resolution Summary</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Summarize the determination and basis of this resolution..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Actions Taken</label>
                <textarea
                  rows={2}
                  required
                  value={actionsTaken}
                  onChange={(e) => setActionsTaken(e.target.value)}
                  placeholder="Detail the operational steps or administrative instructions executed..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Preventive Measures (Optional)</label>
                <textarea
                  rows={2}
                  value={preventiveMeasures}
                  onChange={(e) => setPreventiveMeasures(e.target.value)}
                  placeholder="Systemic or procedural adjustments recommended to prevent recurrence..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? 'Recording Resolution...' : 'Pass Resolution'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Escalate Grievance */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <ArrowUpRight className="h-5 w-5" />
              <h3 className="text-lg font-bold text-gray-900">Escalate Grievance</h3>
            </div>
            <p className="text-xs text-gray-500">
              Escalate this case to supervisory or Super Admin tier due to complexity, jurisdiction conflict, or SLA breach.
            </p>
            <form onSubmit={handleEscalate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Escalation Tier</label>
                <select
                  value={escalateTargetLevel}
                  onChange={(e) => setEscalateTargetLevel(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="LEVEL_2">LEVEL_2 — State / Supervisory Scrutiny</option>
                  <option value="LEVEL_3">LEVEL_3 — Super Admin / National Oversight</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Escalation Justification</label>
                <textarea
                  rows={4}
                  required
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="State the administrative or technical reasons necessitating escalation..."
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEscalateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {actionLoading ? 'Escalating...' : 'Confirm Escalation'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OfficerGrievanceDetailPage;
