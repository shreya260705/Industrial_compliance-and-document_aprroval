import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  BarChart3,
  Clock,
  UserCheck,
  Building2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  FileText,
  Search,
  ExternalLink,
  Shield,
  ArrowUpRight,
  Settings,
  ListOrdered
} from 'lucide-react';
import { adminGrievancesAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminGrievanceOversightPage = () => {
  const [oversight, setOversight] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTrack, setFilterTrack] = useState('');

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedGrievanceId, setSelectedGrievanceId] = useState('');
  const [newOfficerId, setNewOfficerId] = useState('');
  const [reassignJustification, setReassignJustification] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const fetchOversight = async () => {
    try {
      setLoading(true);
      setError(null);
      const [oversightRes, listRes] = await Promise.all([
        adminGrievancesAPI.getOversight(),
        adminGrievancesAPI.listAll({
          search: search || undefined,
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          track: filterTrack || undefined,
          limit: 100
        })
      ]);

      if (oversightRes.data?.success) {
        setOversight(oversightRes.data.data);
      }
      if (listRes.data?.success) {
        setGrievances(listRes.data.data?.results || listRes.data.data?.grievances || []);
      }
    } catch (err) {
      console.error('Failed to load grievance oversight:', err);
      setError(err.response?.data?.error?.message || 'Failed to aggregate national grievance oversight.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOversight();
  }, [filterStatus, filterPriority, filterTrack]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOversight();
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGrievanceId || !newOfficerId.trim() || !reassignJustification.trim()) {
      alert('Please provide grievance ID, new officer ID, and mandatory administrative justification.');
      return;
    }
    try {
      setSubmittingReassign(true);
      await adminGrievancesAPI.reassign(selectedGrievanceId, {
        new_officer_id: newOfficerId.trim(),
        justification: reassignJustification.trim()
      });
      setShowReassignModal(false);
      setSelectedGrievanceId('');
      setNewOfficerId('');
      setReassignJustification('');
      fetchOversight();
      alert('Grievance successfully reassigned and recorded in audit ledger.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reassign grievance.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  const openReassign = (grievanceId) => {
    setSelectedGrievanceId(grievanceId);
    setShowReassignModal(true);
  };

  const getStatusBadge = (status) => {
    const map = {
      SUBMITTED: { label: 'Submitted', variant: 'warning' },
      TRIAGED: { label: 'Triaged', variant: 'info' },
      ASSIGNED: { label: 'Assigned', variant: 'primary' },
      UNDER_INVESTIGATION: { label: 'Under Investigation', variant: 'primary' },
      CLARIFICATION_REQUESTED: { label: 'Clarification', variant: 'warning' },
      REFERRED_FOR_ESCALATION: { label: 'Escalation Referral', variant: 'danger' },
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

  const statusCounts = oversight?.status_counts || {};
  const priorityCounts = oversight?.priority_counts || {};
  const trackCounts = oversight?.track_counts || {};
  const officerWorkload = oversight?.officer_workload || [];
  const stateDist = oversight?.state_breakdown || [];
  const deptDist = oversight?.department_breakdown || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">
            <ShieldAlert className="h-4 w-4" />
            <span>National Governance & Grievance Directorate</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Grievance Oversight & Redressal Desk</h1>
          <p className="text-xs text-gray-500 mt-1">
            National command center for inter-state dispute monitoring, SLA enforcement, and executive reassignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/grievances/categories">
            <Button variant="outline" size="sm">
              <Settings className="h-3.5 w-3.5 mr-1.5" /> Classifications
            </Button>
          </Link>

          <Link to="/admin/grievances/escalation-rules">
            <Button variant="outline" size="sm">
              <ListOrdered className="h-3.5 w-3.5 mr-1.5" /> Escalation Rules
            </Button>
          </Link>

          <Link to="/admin/grievances/audit">
            <Button variant="outline" size="sm">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Audit Ledger
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={fetchOversight} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statutory Safety Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
        <div className="flex">
          <Shield className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-semibold text-blue-900">
              National Redressal Governance Notice (SIH26130 Prototype)
            </p>
            <p>
              BizPermit provides an integrated single-window dispute tracking framework. Statutory decisions
              under state acts (e.g., Gujarat Single Window Act Section 16(2) appellate rules) require verification
              with designated statutory authorities before final executive determination.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-white border-l-4 border-l-primary-600">
          <div className="text-xs font-semibold text-gray-500 uppercase">Total Logged</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {oversight?.total_grievances || grievances.length || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Pan-India Grievances</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-amber-700 uppercase">In Scrutiny</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {(statusCounts['UNDER_INVESTIGATION'] || 0) + (statusCounts['ASSIGNED'] || 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Active investigations</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-yellow-500">
          <div className="text-xs font-semibold text-yellow-700 uppercase">Clarifications</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {statusCounts['CLARIFICATION_REQUESTED'] || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Awaiting applicant</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-red-500">
          <div className="text-xs font-semibold text-red-700 uppercase">Escalated (L2/L3)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {(statusCounts['ESCALATED_L2'] || 0) + (statusCounts['ESCALATED_L3'] || 0) + (statusCounts['REFERRED_FOR_ESCALATION'] || 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">High priority escalations</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-green-500">
          <div className="text-xs font-semibold text-green-700 uppercase">Resolved</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {(statusCounts['RESOLVED'] || 0) + (statusCounts['CLOSED'] || 0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Disputes redressed</div>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-purple-500">
          <div className="text-xs font-semibold text-purple-700 uppercase">Urgent SLA</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {priorityCounts['URGENT'] || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Critical severity</div>
        </Card>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* State Breakdown */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
            <Compass className="h-4 w-4 mr-2 text-primary-600" /> State Distribution
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stateDist && stateDist.length > 0 ? (
              stateDist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0">
                  <span className="font-medium text-gray-800">{item.state || item._id || 'Central Scope'}</span>
                  <Badge variant="outline">{item.count || 0} cases</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No state grievance records found.</p>
            )}
          </div>
        </Card>

        {/* Officer Workload */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary-600" /> Officer Scrutiny Caseload
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {officerWorkload && officerWorkload.length > 0 ? (
              officerWorkload.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0">
                  <div>
                    <span className="font-medium text-gray-800">{item.officer_name || item._id || 'Officer'}</span>
                    <span className="text-gray-400 ml-1 font-mono">({item.officer_id || item._id})</span>
                  </div>
                  <Badge variant="primary">{item.active_cases || item.count || 0} active</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No active officer workloads recorded.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 bg-white">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, enterprise, or keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
              <option value="CLARIFICATION_REQUESTED">CLARIFICATION_REQUESTED</option>
              <option value="ESCALATED_L2">ESCALATED_L2</option>
              <option value="ESCALATED_L3">ESCALATED_L3</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full py-2 px-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" size="sm" className="w-full bg-primary-600 hover:bg-primary-700 text-white">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterStatus('');
                setFilterPriority('');
                setFilterTrack('');
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Grievances Master Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">National Case Registry</h3>
          <span className="text-xs text-gray-500">{grievances.length} cases displayed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Grievance ID</th>
                <th className="py-3 px-4">Title / Track</th>
                <th className="py-3 px-4">State & Dept</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grievances.length > 0 ? (
                grievances.map((g) => (
                  <tr key={g.id || g._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">
                      {g.grievance_id || g.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-gray-900 truncate">{g.title}</div>
                      <div className="text-[11px] text-gray-500">
                        {g.track === 'TRACK_A_INTERNAL' ? 'Track A (Internal)' : 'Track B (Statutory)'} • {g.category_code}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{g.state || 'National'}</div>
                      <div className="text-[11px] text-gray-500 truncate max-w-[150px]">{g.department_name || g.department_code || 'General'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={g.priority === 'URGENT' ? 'danger' : g.priority === 'HIGH' ? 'warning' : 'default'}>
                        {g.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(g.status)}
                    </td>
                    <td className="py-3 px-4">
                      {g.assigned_officer_name ? (
                        <div className="text-gray-900 font-medium">{g.assigned_officer_name}</div>
                      ) : (
                        <span className="text-amber-600 font-medium">Unassigned</span>
                      )}
                      <div className="text-[10px] text-gray-400">Level: {g.escalation_level || 'LEVEL_1'}</div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReassign(g.id || g._id)}
                        className="text-[11px] px-2 py-1 text-gray-700"
                      >
                        Reassign
                      </Button>
                      <Link to={`/officer/grievances/${g.id || g._id}`}>
                        <Button
                          size="sm"
                          className="text-[11px] px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white"
                        >
                          View Case
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No grievance records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Super Admin Reassignment Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Executive Reassignment</h3>
            <p className="text-xs text-gray-500">
              Reassign grievance #{selectedGrievanceId} to a designated department officer. All administrative reassignments are permanently logged in the audit ledger.
            </p>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Officer User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter target officer UUID / User ID..."
                  value={newOfficerId}
                  onChange={(e) => setNewOfficerId(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Administrative Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for reassignment (e.g. jurisdiction realignment, officer leave, SLA escalation)..."
                  value={reassignJustification}
                  onChange={(e) => setReassignJustification(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReassignModal(false)}
                  disabled={submittingReassign}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReassign}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminGrievanceOversightPage;
