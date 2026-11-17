import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { grievancesAPI } from '../services/api';
import {
  ExternalLink,
  PlusCircle,
  Clock,
  ShieldAlert,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';

export const ExternalGrievancesPage = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExternalGrievances = async () => {
    try {
      setLoading(true);
      const res = await grievancesAPI.list({ track: 'EXTERNAL' });
      setGrievances(res.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load external grievance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExternalGrievances();
  }, []);

  const filtered = grievances.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const ext = g.external_tracking || {};
    return (
      g.grievance_reference?.toLowerCase().includes(q) ||
      g.subject?.toLowerCase().includes(q) ||
      ext.external_reference_number?.toLowerCase().includes(q) ||
      ext.authority_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-charcoal">External Statutory Grievance Tracking</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Track B — Applicant Self-Reported
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Independently track government complaints, representations, and statutory petitions filed directly on state or central Single Window portals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/grievances"
            className="px-4 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
          >
            Track A (Internal)
          </Link>
          <Link
            to="/grievances/new"
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-deep-sage hover:bg-brand-charcoal rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Log External Filing
          </Link>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Independent Statutory Tracking Disclaimer:</span> BizPermit does not automatically submit legal complaints to government authorities without separate official integration. External records captured here represent applicant-reported self-attestations accompanied by private vault evidence.
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search external ref, authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
          />
        </div>
        <div className="text-xs text-stone-500">
          Total Tracked: <strong className="text-stone-700">{filtered.length}</strong>
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <Clock className="w-8 h-8 text-stone-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500">Loading external records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No external grievances logged</p>
          <p className="text-xs text-stone-400 mt-1">
            Log external CPGRAMS or state Single Window filings to monitor their timelines alongside your internal compliance calendar.
          </p>
          <Link
            to="/grievances/new"
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-brand-deep-sage text-white text-xs font-medium rounded-lg hover:bg-brand-charcoal transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Log External Filing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const ext = g.external_tracking || {};
            return (
              <div
                key={g.id || g._id}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-3 hover:border-brand-deep-sage/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-deep-sage">{g.grievance_reference}</span>
                    <h3 className="text-sm font-semibold text-brand-charcoal mt-1">{g.subject}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700">
                    {ext.applicant_reported_status || g.status}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">External Authority:</span>
                    <span className="font-semibold text-stone-700">{ext.authority_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">External Ref #:</span>
                    <span className="font-mono font-bold text-brand-amber">{ext.external_reference_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Evidence Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {ext.evidence_status || 'USER_REPORTED'}
                    </span>
                  </div>
                  {ext.portal_url && (
                    <div className="pt-1 border-t border-stone-200/50 flex items-center justify-between">
                      <span className="text-stone-400">Official Portal:</span>
                      <a
                        href={ext.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-deep-sage hover:underline flex items-center gap-1 font-medium"
                      >
                        Visit Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <span>Logged: {new Date(g.created_at).toLocaleDateString()}</span>
                  <Link
                    to={`/grievances/${g.id || g._id}`}
                    className="font-semibold text-brand-deep-sage hover:underline"
                  >
                    View Details & Timeline →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
