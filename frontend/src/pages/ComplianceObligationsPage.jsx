import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { complianceAPI } from '../services/api';
import { useFacility } from '../context/FacilityContext';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ObligationDetailModal } from '../components/compliance/ObligationDetailModal';
import { CustomObligationModal } from '../components/compliance/CustomObligationModal';
import {
  ShieldCheck,
  Search,
  Filter,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const ComplianceObligationsPage = () => {
  const { id: urlObligationId } = useParams();
  const [searchParams] = useSearchParams();
  const queryObligationId = searchParams.get('id');

  const { currentBusiness, locations } = useFacility();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Modals
  const [selectedObligationId, setSelectedObligationId] = useState(
    urlObligationId || queryObligationId || null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(
    Boolean(urlObligationId || queryObligationId)
  );
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  useEffect(() => {
    loadObligations();
  }, [page, searchQuery, facilityFilter, statusFilter, categoryFilter, verificationFilter, currentBusiness]);

  const loadObligations = async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * 20,
        limit: 20,
      };
      if (currentBusiness?.id) params.business_id = currentBusiness.id;
      if (facilityFilter) params.facility_id = facilityFilter;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.compliance_category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await complianceAPI.listObligations(params);
      let list = res.data?.data || [];

      if (verificationFilter) {
        list = list.filter((ob) => ob.source_verification_status === verificationFilter);
      }

      setObligations(list);
      setTotalCount(res.data?.count ?? list.length);
    } catch (err) {
      console.error('Failed to load obligations:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (id) => {
    setSelectedObligationId(id);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    return <Badge variant={s}>{status}</Badge>;
  };

  const getVerificationBadge = (verification) => {
    if (verification === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          VERIFIED
        </span>
      );
    }
    if (verification === 'NEEDS_CONFIRMATION') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-300">
          <AlertCircle className="h-3 w-3 text-purple-600" />
          CONFIRM DATE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-50 text-sky-800 border border-sky-300">
        INDICATIVE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-deep-sage/10 text-brand-deep-sage rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-brand-charcoal">
                  Compliance Obligations Registry
                </h1>
                <Badge variant="demo">Statutory Ledger</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Central ledger of statutory and internal compliance duties, recurring cycles, and evidence audit trails.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCustomModalOpen(true)}
            className="shadow-xs"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" /> Add Internal Obligation
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by title, department code, or obligation number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
            />
          </div>

          {/* Business Location / Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => {
              setFacilityFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
          >
            <option value="">All Business Locations ({locations.length})</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="DUE_SOON">Due Soon (7d)</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Completed</option>
            <option value="NEEDS_CONFIRMATION">Needs Confirmation</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="ENVIRONMENTAL">Environmental</option>
            <option value="LABOUR_SAFETY">Labour & Safety</option>
            <option value="BOILER_PRESSURE_VESSEL">Boilers</option>
            <option value="FIRE_SAFETY">Fire Safety</option>
            <option value="GROUNDWATER">Groundwater</option>
            <option value="HAZARDOUS_MATERIALS">Hazardous Chem</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none"
          >
            <option value="">All Verification</option>
            <option value="VERIFIED">Statutory Verified</option>
            <option value="NEEDS_CONFIRMATION">Needs Confirmation</option>
            <option value="INDICATIVE_INTERNAL">Indicative Internal</option>
          </select>
        </div>
      </div>

      {/* Registry Table Card */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              <div className="animate-spin h-6 w-6 border-2 border-brand-deep-sage border-t-transparent rounded-full mx-auto mb-2" />
              Loading obligations registry...
            </div>
          ) : obligations.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs bg-stone-50">
              No obligations match your query. Try clearing filters or creating a new obligation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3">Obligation #</th>
                    <th className="p-3">Title & Regulatory Scope</th>
                    <th className="p-3">Facility</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Cycle & Freq</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Source Legal Basis</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {obligations.map((ob) => (
                    <tr
                      key={ob.id}
                      className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                      onClick={() => openDetail(ob.id)}
                    >
                      <td className="p-3 font-mono font-semibold text-brand-deep-sage whitespace-nowrap">
                        {ob.obligation_number}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-brand-charcoal">{ob.title}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          Category: {ob.compliance_category}
                        </div>
                      </td>
                      <td className="p-3 text-stone-600 whitespace-nowrap font-medium">
                        {ob.facility_name || 'Location'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {ob.department_code}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-stone-700">#{ob.current_cycle_number}</span>{' '}
                        <span className="text-[10px] text-stone-400">({ob.frequency})</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-brand-charcoal">
                          {ob.due_date
                            ? new Date(ob.due_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date Needed'}
                        </div>
                        {ob.days_until_due !== undefined && (
                          <div className="text-[10px] font-mono">
                            {ob.days_until_due < 0 ? (
                              <span className="text-rose-600 font-bold">
                                {Math.abs(ob.days_until_due)}d overdue
                              </span>
                            ) : ob.days_until_due === 0 ? (
                              <span className="text-amber-600 font-bold">Due today</span>
                            ) : (
                              <span className="text-stone-400">{ob.days_until_due}d left</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">{getStatusBadge(ob.status)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {getVerificationBadge(ob.source_verification_status)}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openDetail(ob.id)}
                          className="text-brand-deep-sage hover:bg-brand-pale-sage/60"
                        >
                          View & Action
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {obligations.length > 0 && (
            <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <div>
                Showing page <strong>{page}</strong> of obligations
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={obligations.length < 20}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      <ObligationDetailModal
        obligationId={selectedObligationId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedObligationId(null);
        }}
        onUpdated={loadObligations}
      />

      <CustomObligationModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onCreated={loadObligations}
      />
    </div>
  );
};
