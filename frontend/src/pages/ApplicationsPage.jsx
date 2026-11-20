import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  Calendar,
  IndianRupee,
  ChevronRight,
  Download,
  Eye,
  Trash2,
  Paperclip,
  UploadCloud,
  Check,
  ArrowRight,
  ExternalLink,
  Shield,
  HelpCircle,
  X,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { applicationAPI, approvalAPI, documentAPI, kyaAPI } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const ApplicationsPage = () => {
  const { user } = useAuth();
  const { currentBusiness, currentLocation, locations, isLoadingFacilities, facilityError } = useFacility();

  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    under_scrutiny: 0,
    clarification: 0,
    resubmitted: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState(currentLocation?.id || '');

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardFacility, setWizardFacility] = useState(null);
  const [availableApprovals, setAvailableApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvalLoadError, setApprovalLoadError] = useState('');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [userVaultDocs, setUserVaultDocs] = useState([]);
  const [uploadingDocumentType, setUploadingDocumentType] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [formData, setFormData] = useState({
    project_capital_cost_lakhs: 500,
    proposed_commissioning_date: '',
    effluent_treatment_details: '',
    air_pollution_control_measures: '',
  });
  const [statutoryAgreed, setStatutoryAgreed] = useState(false);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Clarification Response Modal State
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);
  const [clarificationResponseText, setClarificationResponseText] = useState('');
  const [respondingToApp, setRespondingToApp] = useState(null);
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);

  // Load metrics & applications
  const loadData = async () => {
    try {
      setLoading(true);
      const [appRes, metRes] = await Promise.all([
        applicationAPI.list({
          status: statusFilter || undefined,
          location_id: selectedFacilityId || undefined,
          search: searchQuery || undefined,
        }),
        applicationAPI.getMetrics(),
      ]);

      if (appRes.data?.success) {
        setApplications(appRes.data.data || []);
      }
      if (metRes.data?.success) {
        setMetrics(metRes.data.data || {});
      }
    } catch (err) {
      console.error('Failed to load application dossiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, selectedFacilityId]);

  useEffect(() => {
    if (currentLocation?.id) {
      setSelectedFacilityId(currentLocation.id);
    }
  }, [currentLocation]);

  const loadVaultDocsForBusiness = async (businessId) => {
    if (!businessId) {
      setUserVaultDocs([]);
      return;
    }
    try {
      const docRes = await documentAPI.list({ business_id: businessId, page_size: 100 });
      if (!docRes.data?.success || !Array.isArray(docRes.data.data)) {
        throw new Error(docRes.data?.error?.message || 'The server returned an invalid Vault document list.');
      }
      setUserVaultDocs(docRes.data.data);
    } catch (err) {
      console.error('Failed to load Vault documents for application:', err);
      setAttachmentError(err.response?.data?.error?.message || err.message || 'Failed to load Vault documents.');
    }
  };

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Open Wizard
  const handleStartWizard = async () => {
    setWizardStep(1);
    setStatutoryAgreed(false);
    setActiveDraft(null);
    setSelectedApproval(null);
    setAttachmentError('');
    const initialFac = locations.find((l) => l.id === selectedFacilityId) || locations[0] || null;
    setWizardFacility(initialFac);

    if (initialFac) {
      loadApprovalsForFacility(initialFac);
      await loadVaultDocsForBusiness(initialFac.business_id);
    }

    setIsWizardOpen(true);
  };

  const loadApprovalsForFacility = async (fac) => {
    setLoadingApprovals(true);
    setApprovalLoadError('');
    setAvailableApprovals([]);
    try {
      // Fetch approvals from catalogue for this state
      const stateCode = fac.jurisdiction_hierarchy?.state_code || fac.address?.state_code || 'IN-GJ';
      const res = await approvalAPI.list({ limit: 50 });
      if (!res.data?.success || !Array.isArray(res.data.data)) {
        throw new Error(res.data?.error?.message || 'The server returned an invalid statutory clearance list.');
      }

      // Prioritize approvals matching this state or Central
      const all = res.data.data;
      const relevant = all.filter((a) => !a.state_code || a.state_code === stateCode);
      const approvals = relevant.length > 0 ? relevant : all;
      setAvailableApprovals(approvals);
      if (approvals.length === 0) {
        setApprovalLoadError('No statutory clearances are available in the catalogue for this location.');
      }
    } catch (err) {
      console.error('Failed to load clearance options:', err);
      setApprovalLoadError(err.response?.data?.error?.message || err.message || 'Failed to load statutory clearances.');
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleFacilitySelect = (fac) => {
    setWizardFacility(fac);
    loadApprovalsForFacility(fac);
    loadVaultDocsForBusiness(fac.business_id);
    setWizardStep(2);
  };

  const handleApprovalSelect = async (appr) => {
    setSelectedApproval(appr);
    // Initialize or resume draft application on backend
    try {
      setWizardSubmitting(true);
      const res = await applicationAPI.create({
        business_id: wizardFacility.business_id,
        location_id: wizardFacility.id,
        approval_code: appr.approval_code,
      });

      if (res.data?.success) {
        const draft = res.data.data;
        setActiveDraft(draft);
        await loadVaultDocsForBusiness(draft.business_id || wizardFacility.business_id);
        if (draft.applicant_form_data) {
          setFormData((prev) => ({
            ...prev,
            ...draft.applicant_form_data,
          }));
        }
        setWizardStep(3);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Error initializing draft application.');
    } finally {
      setWizardSubmitting(false);
    }
  };

  const handleUpdateDraftForm = async () => {
    if (!activeDraft) return;
    try {
      setWizardSubmitting(true);
      const res = await applicationAPI.update(activeDraft.id, {
        applicant_form_data: formData,
      });
      if (res.data?.success) {
        setActiveDraft(res.data.data);
        setWizardStep(4);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to update application form data.');
    } finally {
      setWizardSubmitting(false);
    }
  };

  const handleAttachVaultDoc = async (vaultDocId) => {
    if (!activeDraft) return;
    try {
      const res = await applicationAPI.attachDocument(activeDraft.id, vaultDocId);
      if (res.data?.success) {
        setActiveDraft(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to attach document.');
    }
  };

  const handleDetachDoc = async (vaultDocId) => {
    if (!activeDraft) return;
    try {
      const res = await applicationAPI.removeAttachment(activeDraft.id, vaultDocId);
      if (res.data?.success) {
        setActiveDraft(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to remove document attachment.');
    }
  };

  const handleUploadAndAttach = async (event, requirement) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeDraft) return;

    const maxSizeMb = Number(requirement.max_size_mb) || 25;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setAttachmentError(`The selected file exceeds the ${maxSizeMb} MB limit for this upload.`);
      return;
    }

    setAttachmentError('');
    setUploadingDocumentType(requirement.document_type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_name', requirement.name || file.name);
      formData.append('title', requirement.name || file.name);
      formData.append('document_category', requirement.document_type);
      formData.append('business_id', activeDraft.business_id);
      formData.append('location_id', activeDraft.location_id);

      const uploadRes = await documentAPI.directUpload(formData);
      const uploadedDocument = uploadRes.data?.data;
      if (!uploadedDocument?.id) {
        throw new Error('The Vault did not return the uploaded document reference.');
      }

      const attachRes = await applicationAPI.attachDocument(activeDraft.id, uploadedDocument.id);
      if (!attachRes.data?.success || !attachRes.data?.data) {
        throw new Error(attachRes.data?.error?.message || 'The uploaded document could not be attached.');
      }
      setActiveDraft(attachRes.data.data);
      setUserVaultDocs((current) => [uploadedDocument, ...current]);
    } catch (err) {
      setAttachmentError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to upload and attach the document.'
      );
    } finally {
      setUploadingDocumentType('');
    }
  };

  const handleSubmitApplication = async () => {
    if (!activeDraft || !statutoryAgreed) return;
    try {
      setWizardSubmitting(true);
      const res = await applicationAPI.submit(activeDraft.id, { confirmation: true });
      if (res.data?.success) {
        setIsWizardOpen(false);
        loadData();
        // Open detail to show receipt
        handleOpenDetail(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Submission failed.');
    } finally {
      setWizardSubmitting(false);
    }
  };

  const handleOpenDetail = async (app) => {
    try {
      const res = await applicationAPI.get(app.id);
      if (res.data?.success) {
        setSelectedApp(res.data.data);
      } else {
        setSelectedApp(app);
      }
    } catch {
      setSelectedApp(app);
    }
    setIsDetailOpen(true);
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
    } catch (err) {
      alert('Failed to download PDF acknowledgement. Please ensure the application has been submitted.');
    }
  };

  const handleOpenClarification = (app) => {
    setRespondingToApp(app);
    setClarificationResponseText('');
    setIsClarificationOpen(true);
  };

  const handleSubmitClarification = async () => {
    if (!respondingToApp || clarificationResponseText.trim().length < 5) {
      alert('Please enter a comprehensive response (at least 5 characters).');
      return;
    }
    try {
      setClarificationSubmitting(true);
      const res = await applicationAPI.respondClarification(respondingToApp.id, {
        response_text: clarificationResponseText.trim(),
      });
      if (res.data?.success) {
        setIsClarificationOpen(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to submit clarification response.');
    } finally {
      setClarificationSubmitting(false);
    }
  };

  const handleDeleteDraft = async (appId) => {
    if (!confirm('Are you sure you want to discard this draft application?')) return;
    try {
      await applicationAPI.delete(appId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete draft.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="draft">Draft Incomplete</Badge>;
      case 'SUBMITTED':
        return <Badge variant="submitted">Submitted</Badge>;
      case 'UNDER_SCRUTINY':
        return <Badge variant="under_scrutiny">Under Scrutiny</Badge>;
      case 'CLARIFICATION':
        return <Badge variant="clarification">Clarification Query</Badge>;
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
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-walnut">
            <span>Filing & Lifecycle Engine</span>
            <span>•</span>
            <span className="text-brand-deep-sage">Phase 4</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal mt-1 tracking-tight">
            Industrial Applications & Clearances
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Prepare, review, attach vault blueprints, and track departmental scrutiny workflow across Indian jurisdictions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleStartWizard}
            disabled={isLoadingFacilities}
            className="bg-brand-deep-sage hover:bg-[#283b31] text-white text-xs flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Start New Application
          </Button>
        </div>
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Total Dossiers</div>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Drafts</div>
          <div className="text-2xl font-bold text-stone-700 mt-1">{metrics.draft}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Submitted</div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{metrics.submitted}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Under Scrutiny</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{metrics.under_scrutiny}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-orange-200 bg-orange-50/30 shadow-sm">
          <div className="text-[11px] font-medium text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Queries
          </div>
          <div className="text-2xl font-bold text-orange-900 mt-1">{metrics.clarification}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">Approved</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{metrics.approved}</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-rose-200 shadow-sm">
          <div className="text-[11px] font-medium text-rose-800 uppercase tracking-wider">Rejected</div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{metrics.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: 'All Filings', val: '' },
            { label: 'Drafts', val: 'DRAFT' },
            { label: 'Submitted', val: 'SUBMITTED' },
            { label: 'In Scrutiny', val: 'UNDER_SCRUTINY' },
            { label: 'Queries Raised', val: 'CLARIFICATION' },
            { label: 'Approved', val: 'APPROVED' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                statusFilter === tab.val
                  ? 'bg-brand-deep-sage text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Business Location Selector & Search Input */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="text-xs bg-brand-cream/40 border border-stone-300 rounded-md px-2.5 py-1.5 text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-sage max-w-[180px] truncate"
          >
            <option value="">All Facilities</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="Search ref #, approval..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-sage"
            />
            <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-stone-500 bg-white rounded-lg border border-stone-200">
          Loading application dossiers...
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 bg-brand-pale-sage text-brand-deep-sage rounded-full flex items-center justify-center mx-auto">
            <FileCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-brand-charcoal">No Applications Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {statusFilter
              ? `There are currently no applications matching filter '${statusFilter}'.`
              : 'You have not prepared or submitted any approval applications yet.'}
          </p>
          <Button
            onClick={handleStartWizard}
            disabled={isLoadingFacilities}
            className="bg-brand-deep-sage text-white text-xs mt-2"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Start New Application Dossier
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg border border-stone-200 hover:border-brand-sage/60 p-4 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-stone-400" />
                    {app.applicant_form_data?.plant_name || 'Business Location'}
                  </span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5 text-stone-400" />
                    Fee: ₹{app.estimated_fee_inr?.toLocaleString('en-IN') || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    SLA: {app.standard_sla_days} days
                  </span>
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5 text-stone-400" />
                    {app.attached_documents?.length || 0} attached
                  </span>
                </div>

                {/* Assigned Scrutiny Officer Badge */}
                {app.assigned_officer_name && (
                  <div className="flex items-center gap-1.5 text-xs text-brand-deep-sage bg-brand-pale-sage/60 px-2.5 py-1 rounded-md border border-brand-deep-sage/20 w-fit">
                    <UserCheck className="h-3.5 w-3.5 text-brand-deep-sage shrink-0" />
                    <span>Assigned Scrutiny Officer:</span>
                    <strong className="text-stone-900">{app.assigned_officer_name}</strong>
                    {app.assigned_officer_email && (
                      <span className="text-[10px] text-stone-500 font-mono">({app.assigned_officer_email})</span>
                    )}
                  </div>
                )}

                {/* Clarification Alert snippet if in query status */}
                {app.status === 'CLARIFICATION' && app.clarification_query && (
                  <div className="mt-2 p-2.5 rounded bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Department Query:</span> {app.clarification_query.query_text}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Button Group */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                {app.status === 'DRAFT' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDraft(app.id)}
                      className="text-stone-500 hover:text-rose-600 hover:border-rose-300"
                      title="Discard Draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveDraft(app);
                        setSelectedApproval({
                          approval_code: app.approval_code,
                          title: app.approval_title,
                          document_checklist: app.required_document_checklist,
                        });
                        setFormData(app.applicant_form_data || {});
                        setWizardStep(3);
                        setIsWizardOpen(true);
                      }}
                      className="bg-brand-deep-sage text-white text-xs"
                    >
                      Continue Application <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </>
                )}

                {app.status === 'CLARIFICATION' && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenClarification(app)}
                    className="bg-brand-amber hover:bg-[#b56e18] text-white text-xs font-semibold shadow-sm"
                  >
                    Respond to Query
                  </Button>
                )}

                {app.status !== 'DRAFT' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(app.id, app.application_number)}
                    className="text-stone-700 hover:text-brand-deep-sage text-xs flex items-center gap-1.5"
                    title="Download Acknowledgment Receipt"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Receipt PDF
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDetail(app)}
                  className="text-stone-700 hover:text-brand-deep-sage text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View Dossier
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          5-STEP APPLICATION PREPARATION WIZARD MODAL
          ========================================================================= */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-brand-cream/40 px-6 py-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-brand-walnut font-bold">
                  <span>Step {wizardStep} of 5</span>
                  <span>•</span>
                  <span>
                    {wizardStep === 1 && 'Select Business Location'}
                    {wizardStep === 2 && 'Select Statutory Clearance'}
                    {wizardStep === 3 && 'Form Prefill & Specifications'}
                    {wizardStep === 4 && 'Attach Vault Blueprints'}
                    {wizardStep === 5 && 'Statutory Review & Submission'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-brand-charcoal mt-0.5">
                  Prepare Compliance Application
                </h3>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="bg-stone-100 h-1.5 w-full">
              <div
                className="bg-brand-deep-sage h-1.5 transition-all duration-300"
                style={{ width: `${(wizardStep / 5) * 100}%` }}
              />
            </div>

            {/* Wizard Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {/* Step 1: Select Facility */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-stone-600">
                    Select the business establishment or facility premises for which this approval dossier is being prepared:
                  </p>
                  {isLoadingFacilities ? (
                    <p className="text-xs text-stone-500">Loading business locations...</p>
                  ) : locations.length === 0 ? (
                    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                      {facilityError || 'No business locations are registered yet. Register a location before preparing an application dossier.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {locations.map((fac) => (
                        <div
                          key={fac.id}
                          onClick={() => handleFacilitySelect(fac)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            wizardFacility?.id === fac.id
                              ? 'border-brand-deep-sage bg-brand-pale-sage/20 ring-2 ring-brand-deep-sage/20'
                              : 'border-stone-200 hover:border-brand-sage'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-brand-charcoal">{fac.location_name}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                              {fac.industrial_profile?.pollution_category || 'WHITE'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {fac.address?.city}, {fac.jurisdiction_hierarchy?.state_code || fac.address?.state_code}
                          </p>
                          <div className="text-[11px] text-brand-deep-sage font-medium mt-2 flex items-center justify-between">
                            <span>{fac.facility_type?.replace('_', ' ')}</span>
                            <span className="flex items-center font-bold">Select <ChevronRight className="h-3 w-3 ml-0.5" /></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Clearance */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-600">
                      Clearances available for <strong className="text-brand-charcoal">{wizardFacility?.location_name}</strong>:
                    </p>
                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-xs text-brand-deep-sage hover:underline"
                    >
                      ← Change Location
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {loadingApprovals ? (
                      <p className="text-xs text-stone-500">Loading statutory clearances...</p>
                    ) : approvalLoadError ? (
                      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                        {approvalLoadError}
                      </div>
                    ) : availableApprovals.map((appr) => (
                      <div
                        key={appr.approval_code}
                        onClick={() => handleApprovalSelect(appr)}
                        className="p-3.5 rounded-lg border border-stone-200 hover:border-brand-deep-sage hover:bg-brand-pale-sage/10 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-brand-deep-sage bg-brand-pale-sage px-1.5 py-0.5 rounded">
                              {appr.approval_code}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                              {appr.department_code || appr.issuing_department_code}
                            </span>
                            <span className="text-[10px] text-stone-500">{appr.tier}</span>
                          </div>
                          <h4 className="text-xs font-bold text-brand-charcoal">{appr.title}</h4>
                          <p className="text-[11px] text-stone-500 line-clamp-1">{appr.description}</p>
                        </div>
                        <div className="text-right shrink-0 pl-4">
                          <div className="text-xs font-bold text-brand-charcoal">
                            ₹{appr.fee_structure?.base_amount?.toLocaleString('en-IN') || 0}
                          </div>
                          <div className="text-[10px] text-stone-500">SLA: {appr.standard_sla_days}d</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Dynamic Application Form */}
              {wizardStep === 3 && activeDraft && (
                <div className="space-y-4">
                  <div className="bg-brand-cream/60 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
                    <div className="font-bold text-brand-charcoal flex items-center justify-between">
                      <span>Applying for: {selectedApproval?.title}</span>
                      <span className="font-mono text-brand-deep-sage">{activeDraft.application_number}</span>
                    </div>
                    <div className="text-stone-600">
                      Enterprise & facility technical specifications have been prefilled from your registered master profile.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Enterprise Legal Name (Locked)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={activeDraft.applicant_form_data?.enterprise_legal_name || ''}
                        className="w-full bg-stone-100 border border-stone-300 rounded px-2.5 py-1.5 text-stone-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Corporate PAN (Locked)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={activeDraft.applicant_form_data?.enterprise_pan || ''}
                        className="w-full bg-stone-100 border border-stone-300 rounded px-2.5 py-1.5 text-stone-600 cursor-not-allowed font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Total Project Capital Cost (₹ Lakhs) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.project_capital_cost_lakhs}
                        onChange={(e) =>
                          setFormData({ ...formData, project_capital_cost_lakhs: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-brand-sage"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Proposed Commissioning Date *
                      </label>
                      <input
                        type="date"
                        value={formData.proposed_commissioning_date || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, proposed_commissioning_date: e.target.value })
                        }
                        className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-brand-sage"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 mb-1">
                        Effluent Treatment & Discharge Proposal
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Zero Liquid Discharge (ZLD) Multi-Stage RO with Mechanical Vapor Recompression..."
                        value={formData.effluent_treatment_details || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, effluent_treatment_details: e.target.value })
                        }
                        className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-brand-sage"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 mb-1">
                        Air Pollution Control Equipment (APCD) Details
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Baghouse dust collector with 30m stack height, wet scrubber for acid mist..."
                        value={formData.air_pollution_control_measures || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, air_pollution_control_measures: e.target.value })
                        }
                        className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-brand-sage"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-stone-200">
                    <Button variant="outline" size="sm" onClick={() => setWizardStep(2)}>
                      ← Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpdateDraftForm}
                      disabled={wizardSubmitting}
                      className="bg-brand-deep-sage text-white"
                    >
                      Save & Proceed to Document Attachments →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Vault Document Attachments */}
              {wizardStep === 4 && activeDraft && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-brand-charcoal">
                      Required Statutory Document Checklist
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Upload a file directly or attach an existing Vault record. Officers verify documents during scrutiny.
                    </p>
                  </div>
                  {attachmentError && (
                    <div role="alert" className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {attachmentError}
                    </div>
                  )}

                  <div className="space-y-3">
                    {(activeDraft.required_document_checklist || []).map((req, idx) => {
                      // Check if already attached
                      const attached = activeDraft.attached_documents?.find(
                        (a) => a.document_category === req.document_type
                      );

                      // Match available in user's vault
                      const availableInVault = userVaultDocs.filter(
                        (d) => d.document_category === req.document_type &&
                          (!d.location_id || d.location_id === activeDraft.location_id)
                      );

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-lg border text-xs transition-colors ${
                            attached ? 'border-emerald-300 bg-emerald-50/20' : 'border-stone-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-brand-charcoal">{req.name}</span>
                                {req.is_mandatory && (
                                  <span className="text-[10px] text-rose-600 font-bold uppercase">Required</span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                                Category: {req.document_type} • Max size: {req.max_size_mb || 25}MB
                              </div>
                            </div>

                            {attached ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                                  <Check className="h-4 w-4" /> Attached
                                </span>
                                <button
                                  onClick={() => handleDetachDoc(attached.vault_document_id)}
                                  className="text-stone-400 hover:text-rose-600 p-1"
                                  title="Detach"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {availableInVault.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAttachVaultDoc(availableInVault[0].id)}
                                    className="text-brand-deep-sage hover:bg-brand-pale-sage text-[11px]"
                                  >
                                    Attach from Vault
                                  </Button>
                                )}
                                <label className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-brand-deep-sage text-brand-deep-sage hover:bg-brand-pale-sage text-[11px] font-medium cursor-pointer ${uploadingDocumentType === req.document_type ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <UploadCloud className="h-3.5 w-3.5" />
                                  {uploadingDocumentType === req.document_type ? 'Uploading...' : 'Upload & attach'}
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                                    className="hidden"
                                    disabled={Boolean(uploadingDocumentType)}
                                    onChange={(event) => handleUploadAndAttach(event, req)}
                                  />
                                </label>
                                {availableInVault.length === 0 && uploadingDocumentType !== req.document_type && (
                                  <span className="text-[10px] text-stone-400">
                                    Max {Number(req.max_size_mb) || 25} MB
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-stone-200">
                    <Button variant="outline" size="sm" onClick={() => setWizardStep(3)}>
                      ← Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setWizardStep(5)}
                      className="bg-brand-deep-sage text-white"
                    >
                      Proceed to Final Review →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {wizardStep === 5 && activeDraft && (
                <div className="space-y-4">
                  <div className="bg-brand-cream/50 p-4 rounded-lg border border-stone-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div>
                        <div className="text-[10px] font-mono text-stone-500 uppercase">Application Reference</div>
                        <div className="text-base font-bold font-mono text-brand-deep-sage">
                          {activeDraft.application_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-stone-500 uppercase">Estimated Statutory Fee</div>
                        <div className="text-base font-bold text-brand-charcoal">
                          ₹{activeDraft.estimated_fee_inr?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-stone-700">
                      <div><strong>Clearance:</strong> {activeDraft.approval_title}</div>
                      <div><strong>Department:</strong> {activeDraft.department_code}</div>
                      <div><strong>State / Territory:</strong> {activeDraft.state_code}</div>
                      <div><strong>Standard SLA:</strong> {activeDraft.standard_sla_days} business days</div>
                      <div><strong>Capital Investment:</strong> ₹{activeDraft.applicant_form_data?.project_capital_cost_lakhs} Lakhs</div>
                      <div><strong>Documents Attached:</strong> {activeDraft.attached_documents?.length || 0} files</div>
                    </div>
                  </div>

                  {/* Mandatory Prototype Disclaimer */}
                  <div className="p-4 rounded-lg bg-stone-50 border border-stone-300 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-brand-charcoal">
                      <Shield className="h-4 w-4 text-brand-walnut" />
                      Prototype Filing Declaration & SIH26130 Regulatory Notice
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      I affirm that the technical parameters and facility documentation submitted in this application dossier are accurate for prototype demonstration. I acknowledge that BizPermit is an independent Smart India Hackathon 2026 prototype (SIH26130) demonstration workspace and is NOT a government portal. It does not issue legally binding government approvals or replace official state/central single-window clearances.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={statutoryAgreed}
                        onChange={(e) => setStatutoryAgreed(e.target.checked)}
                        className="rounded border-stone-300 text-brand-deep-sage focus:ring-brand-sage h-4 w-4"
                      />
                      <span className="font-semibold text-brand-charcoal text-[11px]">
                        I confirm submission to the internal prototype departmental scrutiny workflow.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-stone-200">
                    <Button variant="outline" size="sm" onClick={() => setWizardStep(4)}>
                      ← Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitApplication}
                      disabled={!statutoryAgreed || wizardSubmitting}
                      className="bg-brand-deep-sage hover:bg-[#283b31] text-white flex items-center gap-2"
                    >
                      {wizardSubmitting ? 'Submitting...' : 'Submit to Scrutiny Workflow'}
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          APPLICATION DOSSIER & AUDIT TIMELINE MODAL
          ========================================================================= */}
      {isDetailOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-stone-200 bg-brand-cream/40 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-deep-sage bg-brand-pale-sage px-2 py-0.5 rounded">
                    {selectedApp.application_number}
                  </span>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <h3 className="text-base font-bold text-brand-charcoal mt-1">
                  {selectedApp.approval_title}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
                <span className="text-stone-600">
                  Authority: <strong>{selectedApp.department_code}</strong> ({selectedApp.state_code || 'Central'})
                </span>
                {selectedApp.status !== 'DRAFT' && (
                  <Button
                    size="sm"
                    onClick={() => handleDownloadPdf(selectedApp.id, selectedApp.application_number)}
                    className="bg-brand-deep-sage text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Acknowledgement PDF
                  </Button>
                )}
              </div>

              {/* Assigned Scrutiny Officer Details */}
              {selectedApp.assigned_officer_name && (
                <div className="p-3.5 bg-brand-pale-sage/50 rounded-lg border border-brand-deep-sage/30 text-xs text-brand-deep-sage flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-brand-deep-sage shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-stone-900 text-sm">
                      Assigned Scrutiny Officer: {selectedApp.assigned_officer_name}
                    </div>
                    <div className="text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Official Email: <strong className="font-mono text-stone-800">{selectedApp.assigned_officer_email}</strong></span>
                      <span>Department: <strong>{selectedApp.department_code}</strong></span>
                      {selectedApp.assigned_officer_badge && <span>Badge: #{selectedApp.assigned_officer_badge}</span>}
                    </div>
                    {selectedApp.assigned_at && (
                      <div className="text-[10px] text-stone-500 font-mono">
                        Assigned on {new Date(selectedApp.assigned_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Decision Section if Approved or Rejected */}
              {selectedApp.decision_details && (
                <div
                  className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                    selectedApp.decision_details.decision === 'APPROVED'
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {selectedApp.decision_details.decision === 'APPROVED' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-700" />
                    )}
                    Prototype Scrutiny Decision: {selectedApp.decision_details.decision}
                  </div>
                  <p><strong>Remarks:</strong> {selectedApp.decision_details.remarks}</p>
                  {selectedApp.decision_details.valid_until && (
                    <p><strong>Indicative Validity:</strong> {selectedApp.decision_details.valid_until}</p>
                  )}
                  <p className="text-[10px] text-stone-500 italic mt-1">
                    * Internal prototype simulation record; does not constitute a legally binding government approval.
                  </p>
                </div>
              )}

              {/* Technical Specifications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-2">
                  Technical Specifications & Facility Data
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-brand-cream/30 p-3.5 rounded-lg border border-stone-200 text-xs">
                  <div><strong>Location:</strong> {selectedApp.applicant_form_data?.plant_name}</div>
                  <div><strong>PAN:</strong> {selectedApp.applicant_form_data?.enterprise_pan}</div>
                  <div><strong>Sector:</strong> {selectedApp.applicant_form_data?.industry_sector}</div>
                  <div><strong>Scale:</strong> {selectedApp.applicant_form_data?.scale}</div>
                  <div><strong>Pollution Cat:</strong> {selectedApp.applicant_form_data?.pollution_category}</div>
                  <div><strong>Capital Cost:</strong> ₹{selectedApp.applicant_form_data?.project_capital_cost_lakhs} Lakhs</div>
                  {selectedApp.applicant_form_data?.effluent_treatment_details && (
                    <div className="col-span-2 sm:col-span-3">
                      <strong>Effluent Treatment:</strong> {selectedApp.applicant_form_data.effluent_treatment_details}
                    </div>
                  )}
                </div>
              </div>

              {/* Attached Vault Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-2">
                  Attached Blueprints & Vault Documents ({selectedApp.attached_documents?.length || 0})
                </h4>
                {selectedApp.attached_documents?.length === 0 ? (
                  <div className="text-xs text-stone-400 italic">No documents attached.</div>
                ) : (
                  <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                    {selectedApp.attached_documents.map((doc, i) => (
                      <div key={i} className="p-3 text-xs flex items-center justify-between bg-white">
                        <div>
                          <div className="font-semibold text-brand-charcoal">{doc.document_name}</div>
                          <div className="text-[10px] font-mono text-stone-400">
                            Category: {doc.document_category} • SHA-256: {doc.sha256_checksum?.slice(0, 16)}...
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          Verified Attached
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Audit History Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono mb-3">
                  Departmental Scrutiny Timeline & Audit Trail
                </h4>
                <div className="relative pl-6 space-y-4 border-l-2 border-stone-200 ml-2">
                  {(selectedApp.status_history || [
                    { to_status: selectedApp.status, changed_at: selectedApp.created_at, remarks: 'Application record updated.' }
                  ]).map((entry, idx) => (
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
          </div>
        </div>
      )}

      {/* =========================================================================
          CLARIFICATION RESPONSE MODAL
          ========================================================================= */}
      {isClarificationOpen && respondingToApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 bg-orange-50/60 px-6 py-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-orange-800 font-bold">
                  Department Query Response
                </div>
                <h3 className="text-sm font-bold text-brand-charcoal">
                  {respondingToApp.application_number}
                </h3>
              </div>
              <button
                onClick={() => setIsClarificationOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded bg-orange-50 border border-orange-200 text-orange-950">
                <div className="font-bold mb-1">Query from {respondingToApp.department_code}:</div>
                <p className="text-[11px]">{respondingToApp.clarification_query?.query_text}</p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Applicant Response & Technical Clarification *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed technical clarification, flow parameters, or reference to updated documents..."
                  value={clarificationResponseText}
                  onChange={(e) => setClarificationResponseText(e.target.value)}
                  className="w-full border border-stone-300 rounded p-2.5 focus:ring-1 focus:ring-brand-sage text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClarificationOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitClarification}
                  disabled={clarificationSubmitting || clarificationResponseText.trim().length < 5}
                  className="bg-brand-deep-sage text-white"
                >
                  {clarificationSubmitting ? 'Transmitting...' : 'Submit Clarification to Officer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
