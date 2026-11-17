import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { officerGrievancesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  Search,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';

export const OfficerGrievanceQueuePage = () => {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('ALL'); // "ME", "UNASSIGNED", "ALL"
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const officerProfile = user?.officer_profile || {};

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = {};
      if (assignedFilter !== 'ALL') params.assigned = assignedFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await officerGrievancesAPI.queue(params);
      setGrievances(res.data?.data?.items || []);
      setTotalCount(res.data?.data?.total_count || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch officer grievance queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [assignedFilter, statusFilter, priorityFilter]);

  const handleSelfAssign = async (e, grvId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await officerGrievancesAPI.assign(grvId, { remarks: 'Officer self-assignment from scrutiny queue.' });
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to assign grievance.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Officer Authority Scoping Context Bar */}
      <div className="bg-brand-charcoal text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-sage" />
            <h1 className="text-xl font-bold">Officer Grievance Scrutiny Desk</h1>
          </div>
          <p className="text-xs text-stone-300 mt-1">
            Department Scrutiny Authority: <strong className="text-brand-amber">{officerProfile.department_code || 'Central/State MSME'}</strong> • Jurisdiction: <strong className="text-brand-amber">{officerProfile.jurisdiction_code || 'IN-GJ'}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs">
            Assigned Queue: <strong className="text-brand-amber">{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['ALL', 'ME', 'UNASSIGNED'].map((f) => (
            <button
              key={f}
              onClick={() => setAssignedFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                assignedFilter === f
                  ? 'bg-brand-deep-sage text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f === 'ALL' ? 'All Scoped' : f === 'ME' ? 'Assigned to Me' : 'Unassigned'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg p-2 bg-white"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchQueue();
            }}
            className="relative flex-1 sm:w-64"
          >
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search reference, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
            />
          </form>
        </div>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <Clock className="w-8 h-8 text-stone-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Loading scrutiny queue...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">{error}</div>
      ) : grievances.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No grievances in queue</p>
          <p className="text-xs text-stone-400 mt-1">There are no grievances matching your active filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {grievances.map((g) => {
            const isOverdue = g.is_overdue;
            const isHighAgeing = (g.ageing_days || 0) > 15;
            return (
              <Link
                key={g.id || g._id}
                to={`/officer/grievances/${g.id || g._id}`}
                className="p-5 hover:bg-stone-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 block"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-brand-deep-sage">
                      {g.grievance_reference}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700">
                      {g.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-700'
                          : g.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {g.priority}
                    </span>
                    {isHighAgeing && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Ageing: {g.ageing_days}d
                      </span>
                    )}
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        SLA Overdue
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-brand-charcoal">{g.subject}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-400 pt-1">
                    <span>Category: <strong className="text-stone-600">{g.category_code}</strong></span>
                    <span>Department: <strong className="text-stone-600">{g.department_code}</strong></span>
                    <span>State: <strong className="text-stone-600">{g.state_code}</strong></span>
                    <span>Lodged: {new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!g.assigned_officer_id ? (
                    <button
                      onClick={(e) => handleSelfAssign(e, g.id || g._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-brand-deep-sage bg-brand-pale-sage hover:bg-brand-pale-sage/80 rounded-lg border border-brand-deep-sage/30 flex items-center gap-1.5 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Self-Assign
                    </button>
                  ) : (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-medium text-stone-700">
                        {g.assigned_officer_name || g.assigned_officer_email}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold">Assigned</div>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
