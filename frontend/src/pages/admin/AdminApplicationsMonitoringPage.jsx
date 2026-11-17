import React, { useState, useEffect } from 'react';
import { adminAPI, applicationAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  Landmark,
  MapPin,
  X,
  History,
  CheckCircle,
  UserCheck,
  UserPlus,
  AlertCircle
} from 'lucide-react';

export const AdminApplicationsMonitoringPage = () => {
  const [applications, setApplications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [inspectApp, setInspectApp] = useState(null);

  // Assign Officer State
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listApplications({
        page,
        department_code: deptFilter || undefined,
        state_code: stateFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) {
        setApplications(res.data.data);
        setPagination(res.data.meta?.pagination || {});
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load platform applications.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersAndOfficers = async () => {
    try {
      const [deptRes, jurRes, offRes] = await Promise.all([
        adminAPI.listDepartments({ page_size: 100 }),
        adminAPI.listJurisdictions({ type: 'STATE' }),
        adminAPI.listOfficers({ page_size: 100 }),
      ]);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (jurRes.data?.success) setJurisdictions(jurRes.data.data);
      if (offRes.data?.success) setOfficers(offRes.data.data);
    } catch (err) {
      console.error('Failed to load filter dropdowns/officers:', err);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchFiltersAndOfficers();
  }, [page, deptFilter, stateFilter, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficerId) {
      setAssignError('Please select an eligible officer.');
      return;
    }
    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');
    try {
      const res = await applicationAPI.assign(inspectApp.id, {
        officer_user_id: selectedOfficerId,
        remarks: assignRemarks || 'Assigned by Super Admin via Application Monitoring Desk',
      });
      if (res.data?.success) {
        setAssignSuccess('Officer assigned successfully. Cross-dashboard events dispatched.');
        const updatedApp = res.data.data;
        setInspectApp((prev) => ({
          ...prev,
          ...updatedApp,
        }));
        setSelectedOfficerId('');
        setAssignRemarks('');
        fetchApplications();
      }
    } catch (err) {
      setAssignError(err.response?.data?.error?.message || 'Failed to assign officer.');
    } finally {
      setAssignLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" size="xs">APPROVED</Badge>;
      case 'UNDER_SCRUTINY':
        return <Badge variant="info" size="xs">UNDER SCRUTINY</Badge>;
      case 'CLARIFICATION':
        return <Badge variant="warning" size="xs">CLARIFICATION</Badge>;
      case 'RESUBMITTED':
        return <Badge variant="demo" size="xs">RESUBMITTED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="xs">REJECTED</Badge>;
      case 'SUBMITTED':
        return <Badge variant="demo" size="xs">SUBMITTED</Badge>;
      default:
        return <Badge variant="default" size="xs">{status || 'DRAFT'}</Badge>;
    }
  };

  const eligibleOfficers = officers.filter(
    (off) =>
      !inspectApp ||
      !inspectApp.department_code ||
      off.officer_profile?.department_code === inspectApp.department_code ||
      off.department_code === inspectApp.department_code
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-brand-charcoal">
            National Application Monitoring Desk
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Platform-wide oversight of statutory approval dossiers, scrutiny queues, officer assignments, and SLA clocks.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchApplications} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by application number, approval title, or enterprise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-stone-300 rounded-md text-xs focus:ring-1 focus:ring-brand-deep-sage focus:outline-none"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="border border-stone-300 rounded-md px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="border border-stone-300 rounded-md px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none"
            >
              <option value="">All States / UTs</option>
              {jurisdictions.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} - {j.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-stone-300 rounded-md px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_SCRUTINY">UNDER SCRUTINY</option>
              <option value="CLARIFICATION">CLARIFICATION</option>
              <option value="RESUBMITTED">RESUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <Button type="submit" size="sm" className="bg-brand-deep-sage text-white shrink-0">
              Apply Filters
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400">Loading platform applications...</div>
          ) : applications.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-mono text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Application Ref #</th>
                  <th className="p-3.5">Approval / Clearance</th>
                  <th className="p-3.5">Enterprise & Location</th>
                  <th className="p-3.5">Assigned Officer</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-brand-deep-sage">
                      {app.application_number}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-brand-charcoal">{app.approval_title || app.approval_name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {app.department_code} • {app.state_code || 'NATIONAL'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-stone-800">{app.business_name || 'Industrial Enterprise'}</div>
                      <div className="text-[10px] text-stone-500">{app.location_name || 'Facility Unit'}</div>
                    </td>
                    <td className="p-3.5">
                      {app.assigned_officer_name ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-pale-sage text-brand-deep-sage text-[11px] font-semibold border border-brand-deep-sage/20">
                          <UserCheck className="h-3 w-3" />
                          <span>{app.assigned_officer_name}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">Unassigned Pool</span>
                      )}
                    </td>
                    <td className="p-3.5">{getStatusBadge(app.status)}</td>
                    <td className="p-3.5 text-stone-500 font-mono text-[11px]">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'Draft'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="xs" variant="outline" onClick={() => {
                        setInspectApp(app);
                        setAssignSuccess('');
                        setAssignError('');
                      }}>
                        <Eye className="h-3 w-3 mr-1" /> Dossier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">No applications match your criteria.</div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="p-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <div>
                Page {pagination.page} of {pagination.total_pages} ({pagination.total_records} total)
              </div>
              <div className="space-x-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Inspect Dossier & Assign Officer Modal */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal font-mono">
                  Dossier: {inspectApp.application_number}
                </h3>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-2 gap-3 font-mono">
                <div>
                  <span className="text-stone-400">Approval Title:</span>
                  <div className="font-bold text-brand-charcoal font-sans">{inspectApp.approval_title || inspectApp.approval_name}</div>
                </div>
                <div>
                  <span className="text-stone-400">Current Status:</span>
                  <div>{getStatusBadge(inspectApp.status)}</div>
                </div>
                <div>
                  <span className="text-stone-400">Department:</span>
                  <div className="font-bold text-brand-charcoal">{inspectApp.department_code}</div>
                </div>
                <div>
                  <span className="text-stone-400">State Jurisdiction:</span>
                  <div className="font-bold text-brand-charcoal">{inspectApp.state_code}</div>
                </div>
                <div>
                  <span className="text-stone-400">Enterprise:</span>
                  <div className="font-bold text-brand-charcoal font-sans">{inspectApp.business_name}</div>
                </div>
                <div>
                  <span className="text-stone-400">Facility Location:</span>
                  <div className="font-bold text-brand-charcoal font-sans">{inspectApp.location_name}</div>
                </div>
              </div>

              {/* Explicit Officer Assignment Section */}
              <div className="p-4 rounded-lg bg-brand-cream/50 border border-brand-sage/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-brand-charcoal flex items-center gap-1.5 text-xs">
                    <UserCheck className="h-4 w-4 text-brand-deep-sage" />
                    Statutory Officer Assignment
                  </h4>
                  {inspectApp.assigned_officer_name && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active Scrutiny Assignment
                    </span>
                  )}
                </div>

                {inspectApp.assigned_officer_name ? (
                  <div className="p-3 bg-white rounded border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{inspectApp.assigned_officer_name}</span>
                      <span className="text-[10px] text-stone-500 font-mono">{inspectApp.assigned_officer_email}</span>
                    </div>
                    <div className="text-[11px] text-stone-600">
                      Designation: <span className="font-medium">{inspectApp.assigned_officer_designation || 'Scrutiny Officer'}</span> • Badge: #{inspectApp.assigned_officer_badge || 'N/A'}
                    </div>
                    {inspectApp.assigned_at && (
                      <div className="text-[10px] text-stone-400 font-mono">
                        Assigned on: {new Date(inspectApp.assigned_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                    This dossier is currently in the general departmental queue and has not been explicitly assigned to a specific officer.
                  </div>
                )}

                {/* Assignment Form */}
                <form onSubmit={handleAssignOfficer} className="space-y-2.5 pt-2 border-t border-brand-sage/30">
                  <span className="font-bold text-[11px] text-brand-charcoal block">
                    {inspectApp.assigned_officer_name ? 'Reassign to Another Officer' : 'Assign to Qualified Department Officer'}
                  </span>

                  {assignSuccess && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[11px]">
                      {assignSuccess}
                    </div>
                  )}
                  {assignError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-[11px]">
                      {assignError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select
                      value={selectedOfficerId}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      className="border border-stone-300 rounded px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-brand-deep-sage bg-white"
                    >
                      <option value="">-- Select Eligible Officer --</option>
                      {eligibleOfficers.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.full_name} ({off.officer_profile?.department_code || off.department_code} - {off.officer_profile?.jurisdiction_code || off.jurisdiction_code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Assignment remarks..."
                      value={assignRemarks}
                      onChange={(e) => setAssignRemarks(e.target.value)}
                      className="border border-stone-300 rounded px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-brand-deep-sage bg-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="xs"
                      className="bg-brand-deep-sage text-white font-medium"
                      disabled={assignLoading || !selectedOfficerId}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      {assignLoading ? 'Assigning...' : inspectApp.assigned_officer_name ? 'Confirm Reassignment' : 'Confirm Assignment'}
                    </Button>
                  </div>
                </form>

                {/* Assignment History */}
                {inspectApp.assignment_history && inspectApp.assignment_history.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Assignment Trail
                    </span>
                    <div className="space-y-1">
                      {inspectApp.assignment_history.map((hist, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-white/70 border border-stone-200 text-[10px] flex justify-between items-center">
                          <span>
                            Assigned to <strong>{hist.assigned_officer_name}</strong> ({hist.assigned_officer_email}) by {hist.assigned_by_role}
                          </span>
                          <span className="font-mono text-stone-400">
                            {new Date(hist.assigned_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrutiny Observations */}
              {inspectApp.decision_details && (
                <div className="p-3 bg-stone-50 rounded border border-stone-200 text-stone-700">
                  <h4 className="font-bold text-brand-charcoal mb-1">Statutory Scrutiny Determination</h4>
                  <div><strong>Decision:</strong> {inspectApp.decision_details.decision}</div>
                  <div><strong>Remarks:</strong> {inspectApp.decision_details.remarks}</div>
                  {inspectApp.decision_details.valid_until && (
                    <div><strong>Validity:</strong> {inspectApp.decision_details.valid_until}</div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setInspectApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminApplicationsMonitoringPage;
