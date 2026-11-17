import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit,
  History,
  CheckCircle2,
  XCircle,
  Search,
  Filter
} from 'lucide-react';
import { adminSchemeAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const AdminSchemesPage = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Audit history modal
  const [historyModalCode, setHistoryModalCode] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSchemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.verification_status = statusFilter;
      if (search) params.search = search;
      const res = await adminSchemeAPI.list(params);
      setSchemes(res.data?.data?.schemes || []);
    } catch (err) {
      console.error('Error fetching admin schemes:', err);
      setError(err.response?.data?.error?.message || 'Failed to load schemes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSchemes();
  };

  const handleOpenHistory = async (code) => {
    setHistoryModalCode(code);
    setHistoryLoading(true);
    try {
      const res = await adminSchemeAPI.getHistory(code);
      setHistoryData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              SUPER_ADMIN OVERSIGHT
            </span>
            <span className="text-xs text-stone-500 font-mono">Module 1 Scheme Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-amber" />
            National Schemes & Statutory Master Governance
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Authoritative administrative management: create schemes, configure declarative rules, verify evidence, and activate versions without modifying application code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/admin/schemes/new')}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Scheme</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search scheme code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-3.5 w-3.5 text-stone-400" />
          <span className="text-xs text-stone-500 font-medium">Verification Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white font-medium text-stone-700 focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="UNDER_VERIFICATION">UNDER_VERIFICATION</option>
            <option value="UNVERIFIED">UNVERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Schemes Master Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-2"></div>
            Loading administrative scheme records...
          </div>
        ) : schemes.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-500">
            No schemes found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold font-mono text-[11px]">
                <tr>
                  <th className="p-3">Scheme Code</th>
                  <th className="p-3">Scheme Title & Jurisdiction</th>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Rule Version</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Intake Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {schemes.map((s) => {
                  const verStatus = s.verification_status || 'VERIFIED';
                  return (
                    <tr key={s.scheme_code} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-stone-800">
                        {s.scheme_code}
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-semibold text-stone-900 truncate">{s.name}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {s.authority_level} • {s.state_code === 'IN-ALL' ? 'Central' : s.state_code}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          {s.financial_instrument_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-700">
                        v{s.active_rule_version || s.scheme_rule_version || '1.0'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            verStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : verStatus === 'UNDER_VERIFICATION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : verStatus === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {verStatus === 'VERIFIED' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                          {verStatus === 'REJECTED' && <XCircle className="h-3 w-3 text-rose-600" />}
                          {verStatus === 'UNDER_VERIFICATION' && <Clock className="h-3 w-3 text-amber-600" />}
                          {verStatus}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span
                          className={`font-semibold ${
                            s.fresh_intake_status === 'OPEN' ? 'text-emerald-700' : 'text-stone-500'
                          }`}
                        >
                          {s.fresh_intake_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/schemes/${s.scheme_code}/edit`)}
                            className="text-[11px] px-2 py-1 flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit & Rules</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/schemes/${s.scheme_code}/verification`)}
                            className="text-[11px] px-2 py-1 flex items-center gap-1 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                          >
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>Evidence</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenHistory(s.scheme_code)}
                            className="text-[11px] p-1 text-stone-400 hover:text-stone-700"
                            title="Audit Log"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit History Modal */}
      {historyModalCode && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-brand-charcoal">Administrative Audit Trail</h3>
                <p className="text-[11px] font-mono text-stone-500">Scheme: {historyModalCode}</p>
              </div>
              <button
                onClick={() => setHistoryModalCode(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {historyLoading ? (
                <div className="py-8 text-center text-stone-500">Loading audit history...</div>
              ) : !historyData?.audit_logs?.length ? (
                <div className="py-8 text-center text-stone-400 font-mono">
                  No administrative mutations recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {historyData.audit_logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-stone-200/80 bg-stone-50 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-stone-500">
                        <span className="font-bold text-brand-charcoal">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Actor: <span className="font-semibold">{log.actor_email}</span> ({log.actor_role})
                      </div>
                      {log.details && (
                        <pre className="text-[10px] font-mono bg-white p-2 rounded border border-stone-200 text-stone-700 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-stone-100 bg-stone-50 text-right">
              <Button size="sm" variant="outline" onClick={() => setHistoryModalCode(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};