import React, { useState, useEffect } from 'react';
import { useFacility } from '../context/FacilityContext';
import { documentAPI } from '../services/api';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  Image,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Building,
  CheckCircle,
  Clock,
  X,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { BusinessManagerModal } from '../components/business/BusinessManagerModal';

const STATUTORY_CATEGORIES = [
  { code: 'IDENTITY_PROOF', label: 'Identity & Signatory Proof' },
  { code: 'INCORPORATION_PROOF', label: 'Incorporation & MOA / AOA / Deed' },
  { code: 'LAND_POSSESSION_LEASE', label: 'Land Possession & Lease Deed' },
  { code: 'SITE_PLAN_LAYOUT', label: 'Factory Site Layout & Architecture' },
  { code: 'POLLUTION_NOC_CTE_CTO', label: 'Pollution Board NOC (CTE / CTO)' },
  { code: 'FIRE_SAFETY_NOC', label: 'Fire Safety NOC & Evacuation Plan' },
  { code: 'FACTORY_LICENSE', label: 'Factory License & Inspector Approval' },
  { code: 'POWER_SANCTION_LETTER', label: 'Electricity Load Sanction Letter' },
  { code: 'WATER_SANCTION_LETTER', label: 'Water Supply Sanction Letter' },
  { code: 'GROUNDWATER_NOC', label: 'Central Ground Water Authority NOC' },
  { code: 'BOILER_REGISTRATION', label: 'Boiler & Pressure Vessel Certificate' },
  { code: 'HAZARDOUS_WASTE_AUTHORIZATION', label: 'Hazardous Waste Authorization' },
  { code: 'EIA_ENVIRONMENTAL_CLEARANCE', label: 'Environmental Clearance (EIA)' },
  { code: 'PROJECT_REPORT_DPR', label: 'Detailed Project Report (DPR)' },
  { code: 'OTHER_STATUTORY_RECORD', label: 'Other Statutory Record' },
];

export const DocumentVaultPage = () => {
  const { currentBusiness, locations } = useFacility();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewModalData, setPreviewModalData] = useState(null);
  const [resubmitModalDoc, setResubmitModalDoc] = useState(null);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState('');
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidationError, setFileValidationError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    document_category: 'POLLUTION_NOC_CTE_CTO',
    location_id: '',
    document_number: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadDocuments();
    }
  }, [currentBusiness?.id, categoryFilter, locationFilter]);

  const loadDocuments = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const params = { business_id: currentBusiness.id };
      if (categoryFilter) params.document_category = categoryFilter;
      if (locationFilter) params.location_id = locationFilter;

      const res = await documentAPI.list(params);
      if (res.data?.success) {
        setDocuments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileValidationError('');
    // Client-side extension validation
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setFileValidationError('Invalid file format. Only PDF, PNG, and JPEG documents are permitted.');
      setSelectedFile(null);
      return;
    }

    // Client-side size validation (25MB limit)
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileValidationError('File exceeds maximum size of 25MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!uploadFormData.title) {
      // Auto-populate title from clean filename
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setUploadFormData((prev) => ({ ...prev, title: baseName }));
    }
  };

  const handleDirectUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileValidationError('Please select a statutory document to upload.');
      return;
    }
    if (!currentBusiness?.id) {
      setFileValidationError('Please select an active enterprise first.');
      return;
    }

    setUploadProgress(true);
    setFileValidationError('');

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('title', uploadFormData.title);
      fd.append('document_name', uploadFormData.title);
      fd.append('document_category', uploadFormData.document_category);
      fd.append('business_id', currentBusiness.id);
      if (uploadFormData.location_id) fd.append('location_id', uploadFormData.location_id);
      if (uploadFormData.document_number) fd.append('document_number', uploadFormData.document_number);
      if (uploadFormData.issuing_authority) fd.append('issuing_authority', uploadFormData.issuing_authority);
      if (uploadFormData.issue_date) fd.append('issue_date', uploadFormData.issue_date);
      if (uploadFormData.expiry_date) fd.append('expiry_date', uploadFormData.expiry_date);
      if (uploadFormData.notes) fd.append('notes', uploadFormData.notes);

      await documentAPI.directUpload(fd);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setUploadFormData({
        title: '',
        document_category: 'POLLUTION_NOC_CTE_CTO',
        location_id: '',
        document_number: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        notes: '',
      });
      loadDocuments();
    } catch (err) {
      setFileValidationError(err.response?.data?.message || 'File upload failed. Ensure file is not corrupt.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handlePreview = async (doc) => {
    try {
      const res = await documentAPI.preview(doc.id);
      if (res.data?.success) {
        setPreviewModalData({
          document: doc,
          previewUrl: res.data.data.preview_url,
          mimeType: res.data.data.mime_type,
          expiresInSeconds: res.data.data.expires_in_seconds,
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate signed preview token.');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await documentAPI.download(doc.id);
      if (res.data?.success) {
        const url = res.data.data.download_url;
        window.open(url, '_blank');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate download token.');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to archive this document from your vault?')) return;
    try {
      await documentAPI.delete(docId);
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive document.');
    }
  };

  // Filtered documents by search query
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.original_filename?.toLowerCase().includes(q) ||
      doc.document_number?.toLowerCase().includes(q) ||
      doc.document_category?.toLowerCase().includes(q)
    );
  });

  const getVerificationBadge = (doc) => {
    const status = (doc.verification_status || 'UPLOADED').toUpperCase();
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
          <CheckCircle className="h-3 w-3" /> Verified {doc.verified_by_officer_name ? `by ${doc.verified_by_officer_name}` : ''}
        </span>
      );
    }
    if (status === 'CORRECTION_REQUESTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
          <AlertTriangle className="h-3 w-3" /> Correction Requested
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
          <AlertTriangle className="h-3 w-3" /> Rejected
        </span>
      );
    }
    if (status === 'PENDING_VERIFICATION' || status === 'RESUBMITTED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
          <Clock className="h-3 w-3" /> {status === 'RESUBMITTED' ? 'Resubmitted (Awaiting Scrutiny)' : 'Pending Verification'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
        Uploaded
      </span>
    );
  };

  const handleResubmitFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResubmitError('');
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setResubmitError('Invalid format. Only PDF, PNG, and JPEG files are permitted.');
      setResubmitFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setResubmitError('File exceeds 25 MB limit.');
      setResubmitFile(null);
      return;
    }
    setResubmitFile(file);
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!resubmitModalDoc || !resubmitFile) {
      setResubmitError('Please select a replacement document file.');
      return;
    }
    setResubmitLoading(true);
    setResubmitError('');
    try {
      const formData = new FormData();
      formData.append('file', resubmitFile);
      await documentAPI.resubmit(resubmitModalDoc.id, formData);
      setResubmitModalDoc(null);
      setResubmitFile(null);
      await loadDocuments();
    } catch (err) {
      setResubmitError(err.response?.data?.error?.message || 'Failed to resubmit document version.');
    } finally {
      setResubmitLoading(false);
    }
  };

  const getExpiryBadge = (expiryDate) => {
    if (!expiryDate) {
      return <Badge size="xs" variant="default">Perpetual / No Expiry</Badge>;
    }
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
          <AlertTriangle className="h-3 w-3" /> Expired ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
          <Clock className="h-3 w-3" /> Due Renewal ({diffDays}d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
        <CheckCircle className="h-3 w-3" /> Valid ({diffDays}d)
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="h-6 w-6 text-brand-deep-sage" />
            <h1 className="text-xl font-bold text-brand-charcoal">Secure Document Vault</h1>
            <Badge variant="demo">Encrypted S3 Private Storage</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Enterprise:{' '}
            <button
              onClick={() => setIsBizModalOpen(true)}
              className="font-bold text-brand-deep-sage underline hover:text-brand-walnut cursor-pointer"
            >
              {currentBusiness?.legal_name || 'Select Enterprise'}
            </button>{' '}
            • {documents.length} Encrypted Dossier{documents.length === 1 ? '' : 's'} Stored
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsBizModalOpen(true)}>
            <Building className="h-4 w-4 mr-1.5" /> Switch Enterprise
          </Button>
          <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Statutory Document
          </Button>
        </div>
      </div>

      {/* Security Info Pill */}
      <div className="flex items-center gap-2 p-3 bg-brand-pale-sage/40 border border-brand-sage/40 rounded-lg text-xs text-brand-charcoal">
        <Lock className="h-4 w-4 text-brand-deep-sage shrink-0" />
        <span>
          <strong>Storage Security Architecture:</strong> Documents are stored in a private Supabase Storage bucket with strict server-side magic byte inspection and SHA-256 integrity checksums. File access is restricted via 15-minute temporary signed tokens. Zero public exposure.
        </span>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-stone-200">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, cert number, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage bg-white"
          >
            <option value="">All Document Categories</option>
            {STATUTORY_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage bg-white"
          >
            <option value="">All Facilities / Enterprise Wide</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          Loading encrypted vault records...
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-brand-pale-sage text-brand-deep-sage rounded-full flex items-center justify-center mx-auto mb-3">
              <FolderArchive className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-brand-charcoal">No Vault Documents Found</h3>
            <p className="text-xs text-stone-500 mt-1 mb-5">
              Upload your land deed, CTE/CTO consent, fire NOC, factory license or DPR to maintain compliance readiness.
            </p>
            <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
              <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Document
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isPdf = doc.mime_type === 'application/pdf';
            const locationObj = locations.find((l) => l.id === doc.location_id);

            return (
              <Card key={doc.id} className="border-stone-200/90 hover:border-brand-sage transition-all flex flex-col justify-between">
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded bg-brand-pale-sage text-brand-deep-sage flex items-center justify-center shrink-0">
                        {isPdf ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-brand-charcoal line-clamp-1" title={doc.title || doc.document_name}>
                          {doc.title || doc.document_name}
                        </h4>
                        <span className="text-[10px] text-stone-500 block truncate max-w-[180px]">
                          {doc.original_filename}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      title="Archive Document"
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Category & Status */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage border border-brand-sage">
                      v{doc.version_number || 1}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                      {doc.document_category?.replace(/_/g, ' ')}
                    </span>
                    {getVerificationBadge(doc)}
                    {getExpiryBadge(doc.expiry_date)}
                  </div>

                  {/* Scrutiny Officer Remarks Alert */}
                  {doc.verification_remarks && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                      <span className="font-semibold block text-[10px] text-amber-800 uppercase tracking-wider">
                        Scrutiny Officer Remarks ({doc.verified_by_officer_name || 'Department Officer'}):
                      </span>
                      <p>{doc.verification_remarks}</p>
                    </div>
                  )}

                  {/* Action Required: Resubmit Corrected Version */}
                  {doc.verification_status === 'CORRECTION_REQUESTED' && (
                    <Button
                      size="sm"
                      onClick={() => { setResubmitModalDoc(doc); setResubmitFile(null); setResubmitError(''); }}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1.5 flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="h-3.5 w-3.5" /> Resubmit Corrected Document
                    </Button>
                  )}

                  {/* Version history link */}
                  {doc.version_history?.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setVersionHistoryDoc(doc)}
                        className="text-[10px] font-medium text-brand-deep-sage hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Clock className="h-3 w-3" /> Prior Versions History ({doc.version_history.length})
                      </button>
                    </div>
                  )}

                  {/* Document Metadata Details */}
                  <div className="bg-stone-50 p-2.5 rounded border border-stone-100 text-[11px] text-stone-600 space-y-1">
                    {doc.document_number && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Ref / Reg No:</span>
                        <span className="font-mono font-semibold text-stone-800">{doc.document_number}</span>
                      </div>
                    )}
                    {doc.issuing_authority && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Authority:</span>
                        <span className="font-medium text-stone-800">{doc.issuing_authority}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-400">Facility:</span>
                      <span className="font-medium text-stone-800">
                        {locationObj ? locationObj.location_name : 'Enterprise Wide'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">File Size:</span>
                      <span className="font-mono text-stone-800">{formatFileSize(doc.file_size_bytes)}</span>
                    </div>
                  </div>

                  {/* SHA-256 fingerprint preview */}
                  {doc.sha256_checksum && (
                    <div className="text-[9px] font-mono text-stone-400 truncate" title={`SHA-256: ${doc.sha256_checksum}`}>
                      SHA-256: {doc.sha256_checksum.substring(0, 16)}...
                    </div>
                  )}
                </CardBody>

                {/* Card Action Buttons */}
                <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handlePreview(doc)}
                    className="inline-flex items-center gap-1 text-brand-deep-sage hover:text-brand-walnut font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Secure Preview
                  </button>

                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1 text-brand-charcoal hover:text-brand-deep-sage font-medium cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Secure Preview Modal */}
      {previewModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-stone-200 overflow-hidden my-8 flex flex-col h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand-amber" />
                <div>
                  <h3 className="font-bold text-sm">{previewModalData.document.title}</h3>
                  <p className="text-[11px] text-stone-200">
                    Signed View Token Active • Expires in {Math.round(previewModalData.expiresInSeconds / 60)} minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalData(null)}
                className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 bg-stone-100 p-4 overflow-hidden flex items-center justify-center">
              {previewModalData.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewModalData.previewUrl}
                  title={previewModalData.document.title}
                  className="w-full h-full rounded border border-stone-300 bg-white shadow-xs"
                />
              ) : (
                <img
                  src={previewModalData.previewUrl}
                  alt={previewModalData.document.title}
                  className="max-h-full max-w-full object-contain rounded shadow-xs"
                />
              )}
            </div>

            <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                Direct bucket access protected. Signed URL valid for single session.
              </span>
              <Button size="sm" variant="outline" onClick={() => setPreviewModalData(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-brand-amber" />
                <div>
                  <h3 className="font-bold text-sm">Upload Statutory Document</h3>
                  <p className="text-[11px] text-stone-200">
                    Enterprise: {currentBusiness?.legal_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDirectUpload} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {fileValidationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                  {fileValidationError}
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-brand-sage bg-stone-50/50 cursor-pointer">
                <input
                  type="file"
                  id="vault-file-input"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="vault-file-input" className="cursor-pointer block">
                  <UploadCloud className="h-8 w-8 text-brand-deep-sage mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-brand-charcoal">{selectedFile.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-brand-charcoal">
                        Click to select document, or drag and drop here
                      </p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Permitted formats: <strong>PDF, PNG, JPEG</strong> (Max size: 25 MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Consent to Establish (CTE) Sanand Facility"
                    value={uploadFormData.title}
                    onChange={(e) => setUploadFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Document Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={uploadFormData.document_category}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, document_category: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  >
                    {STATUTORY_CATEGORIES.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Associated Facility (Optional)
                  </label>
                  <select
                    value={uploadFormData.location_id}
                    onChange={(e) => setUploadFormData((prev) => ({ ...prev, location_id: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  >
                    <option value="">Enterprise Wide (No specific location)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Reference / Certificate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GPCB/CTE/2026/8492"
                    value={uploadFormData.document_number}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, document_number: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Issuing Authority</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat Pollution Control Board"
                    value={uploadFormData.issuing_authority}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, issuing_authority: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={uploadFormData.issue_date}
                    onChange={(e) => setUploadFormData((prev) => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Expiry / Validity Date (If Applicable)
                  </label>
                  <input
                    type="date"
                    value={uploadFormData.expiry_date}
                    onChange={(e) => setUploadFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Document Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Special conditions, conditions precedent, or renewal instructions..."
                    value={uploadFormData.notes}
                    onChange={(e) => setUploadFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={uploadProgress}>
                  Upload & Encrypt in Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resubmit Corrected Document Modal */}
      {resubmitModalDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-amber-700 text-white">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm">Resubmit Document Version</h3>
                  <p className="text-[11px] text-amber-100">
                    {resubmitModalDoc.title || resubmitModalDoc.document_name} • Current: v{resubmitModalDoc.version_number || 1} → New: v{(resubmitModalDoc.version_number || 1) + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResubmitModalDoc(null)}
                className="p-1 rounded-md text-amber-200 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResubmitSubmit} className="p-6 space-y-4">
              {resubmitModalDoc.verification_remarks && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-md">
                  <strong>Officer Required Actions:</strong> {resubmitModalDoc.verification_remarks}
                </div>
              )}

              {resubmitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                  {resubmitError}
                </div>
              )}

              <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-amber-600 bg-stone-50/50 cursor-pointer">
                <input
                  type="file"
                  id="vault-resubmit-file-input"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleResubmitFileSelect}
                  className="hidden"
                />
                <label htmlFor="vault-resubmit-file-input" className="cursor-pointer block">
                  <UploadCloud className="h-8 w-8 text-amber-700 mx-auto mb-2" />
                  {resubmitFile ? (
                    <div>
                      <p className="text-xs font-bold text-brand-charcoal">{resubmitFile.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{formatFileSize(resubmitFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-brand-charcoal">
                        Click to select updated file (PDF, PNG, JPEG)
                      </p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Uploading will archive version v{resubmitModalDoc.version_number || 1} and notify the reviewing officer.
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResubmitModalDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resubmitLoading || !resubmitFile}
                  className="bg-amber-700 hover:bg-amber-800 text-white"
                >
                  {resubmitLoading ? 'Uploading & Notifying...' : 'Submit New Version'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prior Versions History Modal */}
      {versionHistoryDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-amber" />
                <div>
                  <h3 className="font-bold text-sm">Document Version Audit Trail</h3>
                  <p className="text-[11px] text-stone-200">
                    {versionHistoryDoc.title || versionHistoryDoc.document_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVersionHistoryDoc(null)}
                className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 divide-y divide-stone-100">
              <div className="p-3 bg-brand-pale-sage/40 rounded-lg border border-brand-sage text-xs">
                <div className="flex items-center justify-between font-bold text-brand-charcoal">
                  <span>Current Version: v{versionHistoryDoc.version_number || 1}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-deep-sage text-white">Active</span>
                </div>
                <div className="text-[11px] text-stone-600 mt-1 font-mono">Filename: {versionHistoryDoc.original_filename}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Checksum: {versionHistoryDoc.sha256_checksum?.slice(0, 24)}...</div>
              </div>

              {(versionHistoryDoc.version_history || []).map((ver, idx) => (
                <div key={idx} className="pt-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-stone-700">
                    <span>Archived Version: v{ver.version_number}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {ver.uploaded_at ? new Date(ver.uploaded_at).toLocaleString('en-IN') : 'Previous'}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono">File: {ver.original_filename}</div>
                  {ver.verification_status && (
                    <div className="text-[10px] text-stone-600">Status: <strong className="uppercase">{ver.verification_status}</strong></div>
                  )}
                  {ver.verification_remarks && (
                    <div className="p-1.5 rounded bg-stone-50 border border-stone-200 text-[10px] text-stone-600">
                      Officer Remarks: {ver.verification_remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setVersionHistoryDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Workspace Modal */}
      <BusinessManagerModal
        isOpen={isBizModalOpen}
        onClose={() => setIsBizModalOpen(false)}
      />
    </div>
  );
};
