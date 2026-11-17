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
  Sparkles
} from 'lucide-react';
import { adminSchemeReviewAPI, officerSchemeReviewAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminSchemeReviewOversightPage = () => {
  const [oversight, setOversight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignDossierId, setReassignDossierId] = useState('');
  const [newOfficerId, setNewOfficerId] = useState('');
  const [reassignJustification, setReassignJustification] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const fetchOversight = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminSchemeReviewAPI.getOversight();
      if (res.data?.success) {
        setOversight(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load review oversight:', err);
      setError(err.response?.data?.error?.message || 'Failed to load national review oversight.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOversight();
  }, []);

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignDossierId || !newOfficerId || !reassignJustification.trim()) return;
    try {
      setSubmittingReassign(true);
      await adminSchemeReviewAPI.reassignReview(reassignDossierId, {
        new_officer_id: newOfficerId,
        justification: reassignJustification.trim()
      });
      setShowReassignModal(false);
      setReassignDossierId('');
      setNewOfficerId('');
      setReassignJustification('');
      fetchOversight();
      alert('Review dossier successfully reassigned.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reassign review.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-deep-sage" />
        <p className="text-xs text-stone-500">Aggregating national scrutiny oversight data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <div className="text-base font-bold text-brand-charcoal">{error}</div>
        <Button variant="outline" size="sm" onClick={fetchOversight}>Retry</Button>
      </div>
    );
  }

  const statusCounts = oversight?.status_counts || {};
  const stateDist = oversight?.state_distribution || [];
  const deptDist = oversight?.dept_distribution || [];
  const officerWorkload = oversight?.officer_workload || [];
  const ageingMetrics = oversight?.ageing_metrics || {};

  const totalDossiers = Object.values(statusCounts).reduce((acc, val) => acc + val, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">SIH26130 PROTOTYPE GOVERNANCE NOTICE:</span> This National Review Oversight desk provides administrative workflow analytics and workload distribution across all Central and State departmental units. Records tracked here represent internal prototype evaluations and do not replace official statutory gazette portals.
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-charcoal">National Review Oversight</h1>
            <Badge variant="primary" className="font-mono">Super Admin</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time aggregate analytics, departmental throughput, ageing bottlenecks, and officer workload management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOversight} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Analytics</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowReassignModal(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Reassign Dossier</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-stone-400 block">Total Dossiers</span>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">{totalDossiers}</div>
          <span className="text-[10px] text-stone-500">Across all jurisdictions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-amber-600 block">Pending Review</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{statusCounts['PENDING_REVIEW'] || 0}</div>
          <span className="text-[10px] text-stone-500">Awaiting officer pickup</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-blue-600 block">Under Scrutiny</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{statusCounts['UNDER_REVIEW'] || 0}</div>
          <span className="text-[10px] text-stone-500">Active technical review</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-purple-600 block">Clarification Loop</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{statusCounts['CLARIFICATION_REQUESTED'] || 0}</div>
          <span className="text-[10px] text-stone-500">Awaiting applicant reply</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 block">Completed</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{statusCounts['REVIEW_COMPLETED'] || 0}</div>
          <span className="text-[10px] text-stone-500">Evaluations finalized</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-mono font-bold text-rose-600 block">Overdue (&gt;30d)</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{ageingMetrics?.overdue_count || 0}</div>
          <span className="text-[10px] text-stone-500">Turnaround breached</span>
        </div>
      </div>

      {/* Two Column Layout: Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State Distribution */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand-deep-sage" />
              <h2 className="text-sm font-bold text-brand-charcoal">Geographical Distribution (States/UTs)</h2>
            </div>
            <span className="text-[10px] font-mono text-stone-400">{stateDist.length} Jurisdictions Active</span>
          </div>

          {stateDist.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 italic">No state data available.</div>
          ) : (
            <div className="space-y-2">
              {stateDist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg text-xs">
                  <div className="font-mono font-bold text-stone-800">{item._id || 'IN-ALL'}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">{item.count} dossiers</span>
                    <div className="w-24 bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-brand-deep-sage h-2 rounded-full"
                        style={{ width: `${Math.min(100, (item.count / totalDossiers) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-deep-sage" />
              <h2 className="text-sm font-bold text-brand-charcoal">Departmental Distribution</h2>
            </div>
            <span className="text-[10px] font-mono text-stone-400">{deptDist.length} Departments Active</span>
          </div>

          {deptDist.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 italic">No departmental data available.</div>
          ) : (
            <div className="space-y-2">
              {deptDist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg text-xs">
                  <div className="font-mono font-bold text-stone-800">{item._id || 'IND'}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-500">{item.count} dossiers</span>
                    <div className="w-24 bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (item.count / totalDossiers) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Officer Workload Management Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-deep-sage" />
            <h2 className="text-sm font-bold text-brand-charcoal">Department Officer Scrutiny Workload</h2>
          </div>
          <span className="text-[10px] font-mono text-stone-400">{officerWorkload.length} Active Officers</span>
        </div>

        {officerWorkload.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 italic">No officer workload records available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] font-mono uppercase">
                  <th className="py-3 px-4 font-semibold">Officer / Identity</th>
                  <th className="py-3 px-4 font-semibold">Department & State</th>
                  <th className="py-3 px-4 font-semibold">Total Assigned</th>
                  <th className="py-3 px-4 font-semibold">Under Scrutiny</th>
                  <th className="py-3 px-4 font-semibold">Completed</th>
                  <th className="py-3 px-4 font-semibold">Average Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {officerWorkload.map((off, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-800">{off.full_name || off.email}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{off.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      <div>{off.department_code || 'IND'}</div>
                      <div className="text-[10px] text-stone-400">{off.state_code || 'IN-ALL'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-800">{off.total_assigned ?? 0}</td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">{off.under_review ?? 0}</td>
                    <td className="py-3 px-4 text-emerald-600 font-semibold">{off.completed ?? 0}</td>
                    <td className="py-3 px-4 text-stone-600 font-mono">
                      {off.avg_turnaround_days ? `${off.avg_turnaround_days.toFixed(1)} days` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-brand-charcoal">Administrative Dossier Reassignment</h3>
            <p className="text-xs text-stone-500">
              Reassign a review dossier to balance officer workload or reallocate stalled reviews.
            </p>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Dossier ID / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="Mongo Object ID of application dossier..."
                  value={reassignDossierId}
                  onChange={(e) => setReassignDossierId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Target Officer User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Target Officer Mongo User ID..."
                  value={newOfficerId}
                  onChange={(e) => setNewOfficerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Administrative Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mandatory administrative rationale for reassigning review..."
                  value={reassignJustification}
                  onChange={(e) => setReassignJustification(e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 p-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReassignModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={submittingReassign}>
                  {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminSchemeReviewOversightPage;
