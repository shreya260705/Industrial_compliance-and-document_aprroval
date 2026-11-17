import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  Building2,
  Calendar,
  IndianRupee,
  Paperclip,
  Check,
  X,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { officerSchemeReviewAPI } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OfficerSchemeReviewQueuePage = () => {
  const { user, isSuperAdmin } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [assignedFilter, setAssignedFilter] = useState('ALL'); // ALL, ME, UNASSIGNED
  const [reviewStatus, setReviewStatus] = useState('');
  const [schemeCode, setSchemeCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  const officerProfile = user?.officer_profile || {};
  const deptCode = officerProfile.department_code || (isSuperAdmin ? 'NATIONAL_OVERSIGHT' : 'N/A');
  const jurisdictionCode = officerProfile.jurisdiction_code || (isSuperAdmin ? 'IN-ALL' : 'N/A');

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (assignedFilter && assignedFilter !== 'ALL') params.assigned_filter = assignedFilter;
      if (reviewStatus) params.review_status = reviewStatus;
      if (schemeCode) params.scheme_code = schemeCode;
      if (searchQuery) params.search = searchQuery;

      const res = await officerSchemeReviewAPI.getQueue(params);
      if (res.data?.success) {
        setReviews(res.data.data?.reviews || []);
        setTotalCount(res.data.data?.total_count || 0);
      }
    } catch (err) {
      console.error('Failed to load scheme reviews:', err);
      setError(err.response?.data?.error?.message || 'Failed to load officer scrutiny queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [assignedFilter, reviewStatus, schemeCode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueue();
  };

  const handleSelfAssign = async (dossierId) => {
    try {
      setAssigningId(dossierId);
      const res = await officerSchemeReviewAPI.assignReview(dossierId, {
        remarks: 'Self-assigned by department officer for technical scrutiny.'
      });
      if (res.data?.success) {
        loadQueue();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to assign review.');
    } finally {
      setAssigningId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'ASSIGNED':
        return <Badge variant="info">Assigned</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="primary">Under Scrutiny</Badge>;
      case 'CLARIFICATION_REQUESTED':
        return <Badge variant="warning">Clarification Requested</Badge>;
      case 'APPLICANT_RESPONSE_RECEIVED':
        return <Badge variant="success">Response Received</Badge>;
      case 'REVIEW_COMPLETED':
        return <Badge variant="success">Review Completed</Badge>;
      case 'REFERRED_FOR_MANUAL_REVIEW':
        return <Badge variant="secondary">Referred to Senior</Badge>;
      case 'REVIEW_WITHDRAWN':
        return <Badge variant="danger">Withdrawn</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">NORMAL</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Prototype Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">SIH26130 PROTOTYPE ADMINISTRATIVE NOTICE:</span> Scrutiny assessments and recommendation records generated on this desk represent internal BizPermit prototype administrative readiness reviews. They do <span className="underline font-semibold">NOT</span> constitute statutory government approvals, ministerial sanction orders, or legal subsidy clearance.
          </div>
        </div>
      </div>

      {/* Header & Scoping Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-charcoal">Scheme Scrutiny Desk</h1>
            <Badge variant="primary" className="font-mono">Module 2</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Departmental technical review, document verification, and clarification loops for government incentives.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
          <div>
            <span className="text-stone-400 font-medium block text-[10px] uppercase font-mono">Department Scope</span>
            <span className="font-bold text-brand-charcoal">{deptCode}</span>
          </div>
          <div className="h-6 w-px bg-stone-200" />
          <div>
            <span className="text-stone-400 font-medium block text-[10px] uppercase font-mono">Jurisdiction</span>
            <span className="font-bold text-brand-charcoal">{jurisdictionCode}</span>
          </div>
          <div className="h-6 w-px bg-stone-200" />
          <div>
            <span className="text-stone-400 font-medium block text-[10px] uppercase font-mono">Role</span>
            <span className="font-bold text-brand-deep-sage">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Assignment Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setAssignedFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                assignedFilter === 'ALL'
                  ? 'bg-white text-brand-charcoal shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Scoped ({totalCount})
            </button>
            <button
              onClick={() => setAssignedFilter('ME')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                assignedFilter === 'ME'
                  ? 'bg-white text-brand-charcoal shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setAssignedFilter('UNASSIGNED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                assignedFilter === 'UNASSIGNED'
                  ? 'bg-white text-brand-charcoal shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Unassigned Pool
            </button>
          </div>

          {/* Quick Refresh */}
          <Button variant="outline" size="sm" onClick={loadQueue} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Queue</span>
          </Button>
        </div>

        {/* Dropdowns & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Review Status</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
            >
              <option value="">All Active Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
              <option value="APPLICANT_RESPONSE_RECEIVED">Applicant Response Received</option>
              <option value="REVIEW_COMPLETED">Review Completed</option>
              <option value="REFERRED_FOR_MANUAL_REVIEW">Referred for Manual Review</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Scheme Code</label>
            <input
              type="text"
              placeholder="e.g. IN-GJ-AATMA-2022"
              value={schemeCode}
              onChange={(e) => setSchemeCode(e.target.value)}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase font-mono mb-1 block">Search Reference</label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Search reference or scheme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
              <Button type="submit" size="sm" variant="secondary" className="px-3">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-deep-sage" />
            <p>Loading officer scrutiny queue...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-rose-600 space-y-2">
            <AlertTriangle className="h-6 w-6 mx-auto text-rose-500" />
            <p>{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileCheck className="h-10 w-10 text-stone-300 mx-auto" />
            <div className="text-sm font-semibold text-stone-700">No review dossiers in queue</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              There are no scheme application dossiers matching the current filters and scoping boundaries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[10px] font-mono uppercase">
                  <th className="py-3 px-4 font-semibold">Application Ref</th>
                  <th className="py-3 px-4 font-semibold">Scheme & Enterprise</th>
                  <th className="py-3 px-4 font-semibold">Jurisdiction</th>
                  <th className="py-3 px-4 font-semibold">Ageing</th>
                  <th className="py-3 px-4 font-semibold">Review Status</th>
                  <th className="py-3 px-4 font-semibold">Assigned Officer</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reviews.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-pale-sage/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-charcoal">
                      <Link
                        to={`/officer/scheme-reviews/${item.id}`}
                        className="text-brand-deep-sage hover:underline flex items-center gap-1"
                      >
                        {item.application_reference}
                      </Link>
                      <span className="text-[10px] text-stone-400 block font-sans">
                        Created {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-800">{item.scheme_code}</div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0 text-stone-400" />
                        <span>{item.business_name || 'Enterprise Unit'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-stone-700 block">{item.state_code}</span>
                      <span className="text-[10px] text-stone-400">{item.department_code}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-700">{item.ageing_days ?? 0}d</span>
                        {getPriorityBadge(item.priority)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(item.review_status)}
                    </td>

                    <td className="py-3 px-4 text-stone-600">
                      {item.assigned_officer_email ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-stone-400" />
                          <span className="font-medium truncate max-w-[140px]" title={item.assigned_officer_email}>
                            {item.assigned_officer_email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {!item.assigned_officer_id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelfAssign(item.id)}
                          disabled={assigningId === item.id}
                          className="text-[11px] px-2 py-1"
                        >
                          {assigningId === item.id ? 'Assigning...' : 'Pick Up'}
                        </Button>
                      )}
                      <Link to={`/officer/scheme-reviews/${item.id}`}>
                        <Button variant="outline" size="sm" className="text-[11px] px-2 py-1 inline-flex items-center gap-1">
                          <span>Scrutiny</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default OfficerSchemeReviewQueuePage;
