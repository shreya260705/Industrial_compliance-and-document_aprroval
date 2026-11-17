import React, { useState, useEffect } from 'react';
import { approvalAPI, jurisdictionAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Search,
  Filter,
  ExternalLink,
  Clock,
  Coins,
  FileText,
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  ChevronRight,
  X,
  FileCheck2,
} from 'lucide-react';

export const ApprovalCataloguePage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [authorityLevel, setAuthorityLevel] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [stage, setStage] = useState('');
  const [pollutionCategory, setPollutionCategory] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load States from API on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await jurisdictionAPI.getStates();
        if (res.data?.success) {
          setStates(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    fetchStates();
  }, []);

  // Fetch approvals whenever filters or page changes
  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          page_size: 12,
        };
        if (search) params.search = search;
        if (authorityLevel) params.authority_level = authorityLevel;
        if (stateCode) params.state_code = stateCode;
        if (stage) params.stage = stage;
        if (pollutionCategory) params.pollution_category = pollutionCategory;

        const res = await approvalAPI.list(params);
        if (res.data?.success) {
          setApprovals(res.data.data);
          setTotalCount(res.data.meta?.pagination?.total_records || 0);
          setTotalPages(res.data.meta?.pagination?.total_pages || 1);
        }
      } catch (err) {
        console.error('Failed to load approvals:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchApprovals();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [search, authorityLevel, stateCode, stage, pollutionCategory, page]);

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'CENTRAL':
        return <Badge variant="warning">Central Govt</Badge>;
      case 'STATE':
        return <Badge variant="default">State Govt</Badge>;
      case 'LOCAL':
        return <Badge variant="outline">Local / Municipal</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const getStageBadge = (stg) => {
    switch (stg) {
      case 'PRE_ESTABLISHMENT':
        return <Badge variant="secondary">Pre-Establishment</Badge>;
      case 'PRE_OPERATION':
        return <Badge variant="default">Pre-Operation</Badge>;
      case 'OPERATIONAL':
        return <Badge variant="success">Operational</Badge>;
      default:
        return <Badge variant="outline">{stg}</Badge>;
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Verified Official
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            Prototype Demo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-brand-charcoal">National Industrial Approval Catalogue</h1>
            <span className="text-xs bg-brand-pale-sage text-brand-deep-sage px-2 py-0.5 rounded font-mono font-bold">
              {totalCount} Approvals Indexed
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Official statutory clearances, environmental permissions, safety certificates, and operating licenses across Central and State jurisdictions.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by approval name, code, or act..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Authority Tier */}
          <div className="md:col-span-2">
            <select
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white text-stone-700"
              value={authorityLevel}
              onChange={(e) => {
                setAuthorityLevel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Tiers</option>
              <option value="CENTRAL">Central Authorities</option>
              <option value="STATE">State Authorities</option>
              <option value="LOCAL">Local / Municipal</option>
            </select>
          </div>

          {/* State / UT Selector */}
          <div className="md:col-span-2">
            <select
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white text-stone-700"
              value={stateCode}
              onChange={(e) => {
                setStateCode(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All States & UTs (36)</option>
              {states.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div className="md:col-span-2">
            <select
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white text-stone-700"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Project Stages</option>
              <option value="PRE_ESTABLISHMENT">Pre-Establishment</option>
              <option value="PRE_OPERATION">Pre-Operation</option>
              <option value="OPERATIONAL">Operational</option>
            </select>
          </div>

          {/* Pollution Category */}
          <div className="md:col-span-2">
            <select
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white text-stone-700"
              value={pollutionCategory}
              onChange={(e) => {
                setPollutionCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Pollution Categories</option>
              <option value="RED">Red (Heavy Impact)</option>
              <option value="ORANGE">Orange (Medium Impact)</option>
              <option value="GREEN">Green (Low Impact)</option>
              <option value="WHITE">White (Exempted)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters helper */}
        {(search || authorityLevel || stateCode || stage || pollutionCategory) && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-500">Active filters applied</span>
            <button
              onClick={() => {
                setSearch('');
                setAuthorityLevel('');
                setStateCode('');
                setStage('');
                setPollutionCategory('');
                setPage(1);
              }}
              className="text-brand-deep-sage hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Catalogue Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-stone-200">
          <Layers className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-brand-charcoal">No statutory approvals match your criteria</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, state selection, or project stage filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvals.map((app) => (
            <div
              key={app.approval_code}
              onClick={() => setSelectedApproval(app)}
              className="bg-white rounded-lg border border-stone-200 p-5 shadow-sm hover:border-brand-sage hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {getTierBadge(app.tier)}
                  {getStageBadge(app.stage)}
                </div>

                <div className="text-[10px] font-mono text-stone-400 font-bold uppercase mb-1">
                  {app.approval_code} • {app.department_code}
                </div>

                <h3 className="text-sm font-bold text-brand-charcoal line-clamp-2 mb-2">
                  {app.title}
                </h3>

                <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed">
                  {app.description || 'Statutory clearance required under prevailing environmental or industrial safety acts.'}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-stone-500">
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Clock className="w-3.5 h-3.5 text-brand-sage" /> {app.standard_sla_days || 30}d SLA
                  </span>
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Coins className="w-3.5 h-3.5 text-brand-amber" /> ₹{(app.fee_structure?.base_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-brand-deep-sage font-medium flex items-center gap-0.5 text-xs">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-stone-200 text-xs">
          <span className="text-stone-500">
            Page {page} of {totalPages} ({totalCount} approvals)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Approval Detail Drawer Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-start justify-between bg-brand-cream/40">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getTierBadge(selectedApproval.tier)}
                  {getStageBadge(selectedApproval.stage)}
                  {getVerificationBadge(selectedApproval.verification_status)}
                </div>
                <h2 className="text-base font-bold text-brand-charcoal">{selectedApproval.title}</h2>
                <div className="text-xs font-mono text-stone-500 mt-0.5">
                  Code: <span className="font-bold text-brand-deep-sage">{selectedApproval.approval_code}</span> • Department: {selectedApproval.department_code}
                </div>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
              {/* Statutory Basis */}
              <div>
                <h4 className="font-bold text-brand-charcoal uppercase tracking-wider text-[11px] mb-1">
                  Statutory Act & Governing Regulation
                </h4>
                <p className="bg-stone-50 p-2.5 rounded border border-stone-200 font-mono text-[11px] text-stone-800">
                  {selectedApproval.statutory_act || 'Statutory regulatory schedule under Factories / Pollution Control provisions.'}
                </p>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-brand-charcoal uppercase tracking-wider text-[11px] mb-1">
                  Regulatory Scope & Description
                </h4>
                <p className="leading-relaxed text-stone-600">
                  {selectedApproval.description || 'Statutory clearance required for industrial premises prior to establishment or operations.'}
                </p>
              </div>

              {/* SLA & Fee Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-mono uppercase block font-semibold">Standard Citizen Charter SLA</span>
                  <span className="text-base font-bold text-brand-charcoal font-mono mt-0.5 block">
                    {selectedApproval.standard_sla_days || 30} Working Days
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-mono uppercase block font-semibold">Statutory Base Fee</span>
                  <span className="text-base font-bold text-brand-charcoal font-mono mt-0.5 block">
                    ₹{(selectedApproval.fee_structure?.base_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Required Document Checklist */}
              <div>
                <h4 className="font-bold text-brand-charcoal uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-brand-sage" /> Required Document Checklist ({selectedApproval.document_checklist?.length || 0})
                </h4>
                {selectedApproval.document_checklist?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedApproval.document_checklist.map((doc, idx) => (
                      <div key={idx} className="p-2.5 bg-stone-50 rounded border border-stone-200 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-stone-800">{doc.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                            Type: {doc.document_type} • Max Size: {doc.max_size_mb || 15}MB
                          </div>
                        </div>
                        {doc.is_mandatory && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                            Mandatory
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 italic">Standard statutory application dossier requirements apply.</p>
                )}
              </div>

              {/* Official Portals & Verification Citations */}
              <div className="p-4 bg-brand-pale-sage/40 rounded-lg border border-brand-sage/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-deep-sage">Official Application Portal:</span>
                  {selectedApproval.official_portal_url ? (
                    <a
                      href={selectedApproval.official_portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-deep-sage hover:underline font-semibold flex items-center gap-1"
                    >
                      {selectedApproval.official_portal_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-stone-400">State Single Window System</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">Official Citation Reference:</span>
                  {selectedApproval.source_url ? (
                    <a
                      href={selectedApproval.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-600 hover:underline flex items-center gap-1 font-mono text-[10px]"
                    >
                      Official Source <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-stone-400 font-mono text-[10px]">State Gazette / Citizen Charter</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-brand-sage/20">
                  <span className="text-stone-500">Last Verified Date:</span>
                  <span className="font-mono text-stone-700 font-medium">
                    {selectedApproval.last_verified_at || '2026-10-15'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <span className="text-[10px] text-stone-500 italic">
                BizPermit SIH26130 Prototype • Independent compliance guidance
              </span>
              <Button size="sm" onClick={() => setSelectedApproval(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
