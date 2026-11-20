import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complianceAPI } from '../services/api';
import { useFacility } from '../context/FacilityContext';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ObligationDetailModal } from '../components/compliance/ObligationDetailModal';
import {
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const ComplianceRenewalsPage = () => {
  const { currentBusiness, locations } = useFacility();
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facilityFilter, setFacilityFilter] = useState('');

  // Modal
  const [selectedObligationId, setSelectedObligationId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadRenewals();
  }, [currentBusiness, facilityFilter]);

  const loadRenewals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentBusiness?.id) params.business_id = currentBusiness.id;
      if (facilityFilter) params.location_id = facilityFilter;

      const res = await complianceAPI.getRenewals(params);
      setRenewals(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (id) => {
    setSelectedObligationId(id);
    setIsDetailModalOpen(true);
  };

  // Summaries
  const overdueRenewals = renewals.filter((r) => r.status === 'OVERDUE');
  const dueSoonRenewals = renewals.filter((r) => r.status === 'DUE_SOON' || r.status === 'DUE_TODAY');
  const activeRenewals = renewals.filter((r) => r.status !== 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-amber/15 text-brand-amber rounded-lg">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-brand-charcoal">
                  Statutory Renewals & Expiration Pipeline
                </h1>
                <Badge variant="demo">License Tracking Engine</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Proactive tracking and advance renewal filing reminders for Consent to Operate (CTO), Factory Licenses, Boilers and Fire NOCs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/compliance/calendar">
            <Button variant="outline" size="sm" className="shadow-xs">
              <Calendar className="h-4 w-4 mr-1.5" /> View on Calendar
            </Button>
          </Link>
          <Link to="/applications">
            <Button variant="primary" size="sm" className="shadow-xs">
              <FileCheck className="h-4 w-4 mr-1.5" /> File New Application
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-stone-200 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-stone-400">Total Tracked Renewals</div>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">{renewals.length}</div>
          <div className="text-[11px] text-stone-500">Across business locations</div>
        </div>

        <div className="p-4 bg-amber-50/70 rounded-lg border border-amber-300 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-amber-700 font-bold flex items-center gap-1">
            <Clock className="h-3 w-3" /> Due for Filing
          </div>
          <div className="text-2xl font-bold text-amber-950 mt-1">{dueSoonRenewals.length}</div>
          <div className="text-[11px] text-amber-800">Within renewal window</div>
        </div>

        <div className="p-4 bg-rose-50/70 rounded-lg border border-rose-300 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-rose-700 font-bold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Overdue / Expired
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{overdueRenewals.length}</div>
          <div className="text-[11px] text-rose-700">Immediate regularisation needed</div>
        </div>

        <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> In Good Standing
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            {renewals.length - overdueRenewals.length - dueSoonRenewals.length}
          </div>
          <div className="text-[11px] text-emerald-700">Valid statutory licenses</div>
        </div>
      </div>

      {/* Business Location Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 text-xs">
        <Building2 className="h-4 w-4 text-stone-400" />
        <span className="font-semibold text-stone-700">Filter by Location:</span>
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="px-2.5 py-1 text-xs border border-stone-300 rounded-md focus:outline-none"
        >
          <option value="">All Locations ({locations.length})</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.location_name}
            </option>
          ))}
        </select>
      </div>

      {/* Renewals Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-brand-amber" />
            Recurring Regulatory Approvals & License Cycles
          </CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              <div className="animate-spin h-6 w-6 border-2 border-brand-deep-sage border-t-transparent rounded-full mx-auto mb-2" />
              Loading renewals pipeline...
            </div>
          ) : renewals.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs bg-stone-50 rounded-lg">
              No statutory renewal obligations found. Visit the Compliance Dashboard to generate statutory obligations for your business locations.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renewals.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className="p-4 rounded-lg border border-stone-200 hover:border-brand-deep-sage/50 hover:shadow-xs transition-all cursor-pointer bg-white space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 uppercase">
                        {item.obligation_number}
                      </span>
                      <h3 className="font-bold text-sm text-brand-charcoal">{item.title}</h3>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {item.facility_name || 'Location'} • {item.department_code}
                      </div>
                    </div>
                    <Badge variant={(item.status || '').toLowerCase()}>{item.status}</Badge>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2">
                    {item.description || 'Statutory renewal obligation.'}
                  </p>

                  <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-mono block">
                        Statutory Expiry / Due Date
                      </span>
                      <strong className="text-brand-charcoal">
                        {item.due_date
                          ? new Date(item.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Date Needed'}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-stone-400 text-[10px] uppercase font-mono block">
                        Cycle & Validity
                      </span>
                      <span className="font-semibold text-brand-deep-sage">
                        Cycle #{item.current_cycle_number} ({item.frequency})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] font-mono text-stone-500">
                      Window: 60 days advance filing
                    </span>
                    <Button variant="ghost" size="xs" className="text-brand-deep-sage font-semibold">
                      <span>View & Record Renewal</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <ObligationDetailModal
        obligationId={selectedObligationId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedObligationId(null);
        }}
        onUpdated={loadRenewals}
      />
    </div>
  );
};
