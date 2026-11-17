import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { grievancesAPI } from '../services/api';
import {
  AlertCircle,
  PlusCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const GrievancesPage = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      const params = { track: 'INTERNAL' };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await grievancesAPI.list(params);
      setGrievances(res.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load grievances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [statusFilter]);

  const filteredGrievances = grievances.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.grievance_reference?.toLowerCase().includes(q) ||
      g.subject?.toLowerCase().includes(q) ||
      g.category_code?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
      case 'TRIAGED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Submitted</span>;
      case 'ASSIGNED':
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Under Review</span>;
      case 'CLARIFICATION_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Clarification Needed</span>;
      case 'RESPONSE_RECEIVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Response Filed</span>;
      case 'RESOLUTION_PROPOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">Resolution Proposed</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">Closed</span>;
      case 'REFERRED_FOR_ESCALATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Escalated</span>;
      case 'WITHDRAWN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-600 border border-stone-300">Withdrawn</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">URGENT</span>;
      case 'HIGH':
        return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">HIGH</span>;
      case 'NORMAL':
        return <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded">NORMAL</span>;
      default:
        return <span className="text-xs text-stone-500">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-charcoal">Grievance Redressal Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-pale-sage text-brand-deep-sage border border-brand-deep-sage/20">
              Track A — Internal Service Redressal
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Submit, track, and resolve administrative service concerns, clarification disputes, and technical bottlenecks.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            to="/grievances/external-tracking"
            className="px-4 py-2 text-xs font-medium text-brand-deep-sage bg-brand-pale-sage/60 hover:bg-brand-pale-sage border border-brand-deep-sage/20 rounded-lg flex items-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4" />
            External Statutory Tracking (Track B)
          </Link>
          <Link
            to="/grievances/new"
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-deep-sage hover:bg-brand-charcoal rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Lodge Grievance
          </Link>
        </div>
      </div>

      {/* Prototype Legal Disclaimer Notice */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">SIH26130 Prototype Advisory:</span> Internal BizPermit grievance redressal processes operate under departmental administrative service targets. Resolution records do not constitute statutory judicial decrees. For external government representations, utilize Track B tracking.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === st
                  ? 'bg-brand-deep-sage text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st === 'ALL' ? 'All Grievances' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search reference, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
          />
        </div>
      </div>

      {/* Grievances List */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <Clock className="w-8 h-8 text-stone-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Loading grievances...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
          {error}
        </div>
      ) : filteredGrievances.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No grievances found</p>
          <p className="text-xs text-stone-400 mt-1">
            {statusFilter !== 'ALL' ? 'No grievances match the active filter.' : 'You have not submitted any grievances yet.'}
          </p>
          <Link
            to="/grievances/new"
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-brand-deep-sage text-white text-xs font-medium rounded-lg hover:bg-brand-charcoal transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Lodge Grievance
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {filteredGrievances.map((g) => (
            <Link
              key={g.id || g._id}
              to={`/grievances/${g.id || g._id}`}
              className="p-5 hover:bg-stone-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 block"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-brand-deep-sage">{g.grievance_reference}</span>
                  {getStatusBadge(g.status)}
                  {getPriorityBadge(g.priority)}
                  {g.escalation_level && g.escalation_level !== 'LEVEL_1' && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {g.escalation_level}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-brand-charcoal">{g.subject}</h3>
                <p className="text-xs text-stone-500 line-clamp-1">{g.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-400 pt-1">
                  <span>Category: <strong className="text-stone-600">{g.category_code}</strong></span>
                  <span>Jurisdiction: <strong className="text-stone-600">{g.state_code}</strong></span>
                  <span>Filed: {new Date(g.created_at).toLocaleDateString()}</span>
                  {g.internal_target_date && (
                    <span className="flex items-center gap-1 text-stone-500">
                      <Clock className="w-3 h-3 text-brand-amber" />
                      Target: {new Date(g.internal_target_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-stone-700">
                    {g.assigned_officer_name || 'Pending Assignment'}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {g.assigned_officer_email || 'Regional Desk'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
