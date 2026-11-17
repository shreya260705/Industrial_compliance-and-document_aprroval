import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderArchive,
  ArrowRight,
  Filter,
  ShieldCheck,
  Search,
  ExternalLink
} from 'lucide-react';
import { schemeApplicationAPI, businessAPI, schemeAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchemeApplicationsPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // New Dossier Modal state
  const [showModal, setShowModal] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await schemeApplicationAPI.list(params);
      setApplications(res.data?.data?.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load scheme applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  // Load locations and schemes for modal
  const openCreateModal = async () => {
    setShowModal(true);
    setCreateError(null);
    try {
      const bizRes = await businessAPI.list();
      const bizList = bizRes.data?.data?.businesses || [];
      setBusinesses(bizList);

      const allLocs = [];
      for (const b of bizList) {
        const locRes = await businessAPI.listLocations(b.id);
        const bLocs = locRes.data?.data?.locations || [];
        bLocs.forEach(loc => {
          allLocs.push({ ...loc, businessName: b.legal_name });
        });
      }
      setLocations(allLocs);
      if (allLocs.length > 0) setSelectedLocationId(allLocs[0].id);

      const schemeRes = await schemeAPI.list({ fresh_intake_status: 'OPEN' });
      const openSchemes = schemeRes.data?.data?.schemes || [];
      setSchemes(openSchemes);
      if (openSchemes.length > 0) setSelectedSchemeCode(openSchemes[0].scheme_code);
    } catch (err) {
      console.error('Error preparing modal:', err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocationId || !selectedSchemeCode) {
      setCreateError('Please select both a facility and a target scheme.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await schemeApplicationAPI.create({
        location_id: selectedLocationId,
        scheme_code: selectedSchemeCode
      });
      const appId = res.data?.data?.application?.id;
      setShowModal(false);
      navigate(`/scheme-applications/${appId}`);
    } catch (err) {
      console.error('Creation error:', err);
      setCreateError(err.response?.data?.error?.message || 'Failed to create scheme application.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="draft" className="bg-stone-100 text-stone-700">Draft Dossier</Badge>;
      case 'DOCUMENT_ASSEMBLY':
        return <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200">Document Assembly</Badge>;
      case 'READY_FOR_FILING':
        return <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">Ready for External Filing</Badge>;
      case 'USER_REPORTED_EXTERNAL_SUBMISSION':
        return <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Officially Submitted (Attested)</Badge>;
      default:
        return <Badge variant="draft">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/schemes" className="text-xs text-stone-500 hover:text-brand-deep-sage font-mono">
              Catalogue
            </Link>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-amber">
              Filing Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-deep-sage" />
            Scheme Application Dossiers & External Submissions
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl">
            Prepare compliance dossiers, link Document Vault certificates, and record verified user self-attestations following submission on designated government portals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Scheme Dossier</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-stone-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-stone-400" />
          <span className="font-semibold text-stone-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-stone-200 rounded px-2.5 py-1 text-xs bg-stone-50/50 outline-none focus:border-brand-deep-sage"
          >
            <option value="">All Applications ({applications.length})</option>
            <option value="DRAFT">Draft</option>
            <option value="DOCUMENT_ASSEMBLY">Document Assembly</option>
            <option value="READY_FOR_FILING">Ready for Filing</option>
            <option value="USER_REPORTED_EXTERNAL_SUBMISSION">Submitted & Attested</option>
          </select>
        </div>

        <Link
          to="/schemes/recommendations"
          className="text-xs font-semibold text-brand-deep-sage hover:underline flex items-center gap-1"
        >
          <span>Find eligible schemes for my business</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-3"></div>
          <p className="text-xs text-stone-500">Loading scheme applications...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg text-rose-700 text-xs">
          {error}
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-stone-200 space-y-3">
          <FileText className="h-8 w-8 text-stone-400 mx-auto" />
          <h4 className="text-sm font-bold text-brand-charcoal">No scheme applications created yet</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Initialize an application dossier for your business location to assemble documents and prepare external filing packages.
          </p>
          <Button
            onClick={openCreateModal}
            className="bg-brand-deep-sage text-white text-xs px-4"
          >
            Create First Dossier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="p-4 border-stone-200 hover:shadow-sm transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-brand-deep-sage bg-brand-pale-sage px-2 py-0.5 rounded">
                      {app.application_reference}
                    </span>
                    {getStatusBadge(app.status)}
                    <span className="text-[11px] font-mono text-stone-400">
                      Rule Version: {app.scheme_rule_version || '1.0'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-brand-charcoal">
                      <Link to={`/scheme-applications/${app.id}`} className="hover:text-brand-deep-sage">
                        {app.scheme_name || app.scheme_code}
                      </Link>
                    </h3>
                    <div className="text-[11px] text-stone-500 flex items-center gap-3 mt-0.5">
                      <span>Scheme Code: <strong>{app.scheme_code}</strong></span>
                      <span>•</span>
                      <span>Attached Docs: <strong>{app.attached_vault_documents?.length || 0}</strong></span>
                      <span>•</span>
                      <span>Created: {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {app.external_submission && (
                    <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded inline-flex items-center gap-2 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Portal: {app.external_submission.external_portal_name} (Ref: {app.external_submission.external_acknowledgement_number})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/scheme-applications/${app.id}`)}
                    className="bg-stone-800 hover:bg-stone-900 text-white text-xs px-3"
                  >
                    <span>{app.status === 'USER_REPORTED_EXTERNAL_SUBMISSION' ? 'View Dossier' : 'Continue Preparation'}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Dossier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-brand-charcoal flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-deep-sage" />
                Initialize Scheme Application Dossier
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  1. Select Business Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full border border-stone-200 rounded px-3 py-2 bg-stone-50 text-xs focus:border-brand-deep-sage outline-none"
                  required
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} ({loc.address?.state_code || 'IN-XX'}) — {loc.businessName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  2. Select Scheme (Fresh Intake Open)
                </label>
                <select
                  value={selectedSchemeCode}
                  onChange={(e) => setSelectedSchemeCode(e.target.value)}
                  className="w-full border border-stone-200 rounded px-3 py-2 bg-stone-50 text-xs focus:border-brand-deep-sage outline-none"
                  required
                >
                  {schemes.map(s => (
                    <option key={s.scheme_code} value={s.scheme_code}>
                      {s.short_name} ({s.scheme_code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Only schemes with confirmed, open intake windows are permissible for fresh application drafting.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4"
                >
                  {creating ? 'Creating...' : 'Create Application Dossier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
