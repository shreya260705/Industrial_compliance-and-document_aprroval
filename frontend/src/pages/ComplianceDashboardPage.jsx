import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complianceAPI } from '../services/api';
import { useFacility } from '../context/FacilityContext';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ObligationDetailModal } from '../components/compliance/ObligationDetailModal';
import { CustomObligationModal } from '../components/compliance/CustomObligationModal';
import {
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Building2,
  ChevronRight,
  Filter,
  ArrowUpRight,
  PlusCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const ComplianceDashboardPage = () => {
  const { currentBusiness, locations } = useFacility();
  const [metrics, setMetrics] = useState(null);
  const [upcomingList, setUpcomingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingForLoc, setGeneratingForLoc] = useState(null);
  const [generationMsg, setGenerationMsg] = useState(null);

  // Modals
  const [selectedObligationId, setSelectedObligationId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Filters
  const [selectedFacilityId, setSelectedFacilityId] = useState('');

  useEffect(() => {
    loadComplianceDashboard();
  }, [currentBusiness, selectedFacilityId]);

  const loadComplianceDashboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentBusiness?.id) params.business_id = currentBusiness.id;
      if (selectedFacilityId) params.facility_id = selectedFacilityId;

      const [metricsRes, listRes] = await Promise.all([
        complianceAPI.getMetrics(params),
        complianceAPI.listObligations({ ...params, limit: 10 }),
      ]);

      setMetrics(metricsRes.data?.data || null);
      setUpcomingList(listRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load compliance dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForFacility = async (facilityId) => {
    setGeneratingForLoc(facilityId);
    setGenerationMsg(null);
    try {
      const res = await complianceAPI.generateForLocation(facilityId);
      const data = res.data?.data;
      setGenerationMsg(
        `Generated ${data.created_count} statutory obligations for ${data.facility_name || 'facility'}.`
      );
      await loadComplianceDashboard();
    } catch (err) {
      setGenerationMsg(
        `Error: ${err.response?.data?.error?.message || 'Failed to generate obligations'}`
      );
    } finally {
      setGeneratingForLoc(null);
    }
  };

  const openObligationDetail = (id) => {
    setSelectedObligationId(id);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    return <Badge variant={s}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-deep-sage/10 text-brand-deep-sage rounded-lg">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-brand-charcoal">
                  Compliance Obligations & Calendar Engine
                </h1>
                <Badge variant="demo">Phase 5 Engine Active</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Statutory filing obligations, recurrence schedules, and renewal automation across all business locations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomModalOpen(true)}
            className="shadow-xs"
          >
            <PlusCircle className="h-4 w-4 mr-1.5 text-brand-deep-sage" /> Add Custom Obligation
          </Button>
          <Link to="/compliance/calendar">
            <Button variant="secondary" size="sm" className="shadow-xs">
              <CalendarDays className="h-4 w-4 mr-1.5" /> Interactive Calendar
            </Button>
          </Link>
          <Link to="/compliance/renewals">
            <Button variant="accent" size="sm" className="shadow-xs">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Renewals Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* Generation Status Alert */}
      {generationMsg && (
        <div className="p-3 bg-brand-pale-sage/60 border border-brand-sage rounded-lg text-brand-deep-sage text-xs font-medium flex items-center justify-between">
          <span>{generationMsg}</span>
          <button
            onClick={() => setGenerationMsg(null)}
            className="text-stone-400 hover:text-stone-600 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Facility Filter Selector */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 text-xs">
        <Filter className="h-4 w-4 text-stone-400" />
        <span className="font-semibold text-stone-700">Filter Facility:</span>
        <select
          value={selectedFacilityId}
          onChange={(e) => setSelectedFacilityId(e.target.value)}
          className="px-2.5 py-1 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
        >
          <option value="">All Business Locations ({locations.length})</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.location_name} ({loc.address?.city || 'Facility'})
            </option>
          ))}
        </select>
        {selectedFacilityId && (
          <button
            onClick={() => setSelectedFacilityId('')}
            className="text-brand-deep-sage underline hover:text-stone-900"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Active */}
        <div className="p-4 bg-white rounded-lg border border-stone-200/80 shadow-xs">
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
            Total Active
          </div>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">
            {metrics?.total_obligations ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Tracking live</div>
        </div>

        {/* Due Today */}
        <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-300 shadow-xs">
          <div className="text-[10px] font-mono text-amber-700 uppercase tracking-wider flex items-center gap-1 font-bold">
            <Clock className="h-3 w-3" /> Due Today
          </div>
          <div className="text-2xl font-bold text-amber-950 mt-1">
            {metrics?.due_today ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">Immediate action</div>
        </div>

        {/* Due Soon (7 Days) */}
        <div className="p-4 bg-white rounded-lg border border-stone-200/80 shadow-xs">
          <div className="text-[10px] font-mono text-amber-600 uppercase tracking-wider">
            Due Soon (7d)
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {metrics?.due_soon ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Approaching</div>
        </div>

        {/* Overdue */}
        <div className="p-4 bg-rose-50/60 rounded-lg border border-rose-300 shadow-xs">
          <div className="text-[10px] font-mono text-rose-700 uppercase tracking-wider flex items-center gap-1 font-bold">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">
            {metrics?.overdue ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5">Statutory risk</div>
        </div>

        {/* Upcoming */}
        <div className="p-4 bg-white rounded-lg border border-stone-200/80 shadow-xs">
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
            Upcoming
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-1">
            {metrics?.upcoming ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Future schedule</div>
        </div>

        {/* Completed */}
        <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <CheckCircle className="h-3 w-3" /> Completed
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            {metrics?.completed ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Evidence verified</div>
        </div>

        {/* Renewals */}
        <div className="p-4 bg-white rounded-lg border border-stone-200/80 shadow-xs">
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-brand-amber" /> Renewals
          </div>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">
            {metrics?.renewals_count ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">License trackers</div>
        </div>
      </div>

      {/* Progress & Facility Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Health Score Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-deep-sage" />
              Statutory Compliance Health
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold text-brand-deep-sage font-mono">
                  {metrics?.completion_percentage ?? 0}%
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Completion rate across active obligations
                </div>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-brand-deep-sage flex items-center justify-center font-mono font-bold text-xs text-brand-charcoal bg-brand-cream/50">
                {metrics?.completion_percentage ?? 0}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-deep-sage h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.completion_percentage ?? 0}%` }}
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="flex justify-between">
                <span>Completed Cycles:</span>
                <strong className="text-brand-charcoal">{metrics?.completed ?? 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pending Confirmation:</span>
                <strong className="text-purple-700">{metrics?.needs_confirmation ?? 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>Action Overdue:</span>
                <strong className="text-rose-700">{metrics?.overdue ?? 0}</strong>
              </div>
            </div>

            <Link to="/compliance/obligations" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full justify-center">
                <span>View All Obligations in Registry</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardBody>
        </Card>

        {/* Industrial Facilities Compliance Matrix */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-walnut" />
              Business Locations & Facilities Status
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="p-8 text-center text-stone-400 text-xs">Loading facility status...</div>
            ) : locations.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded-lg">
                No facilities registered. Add business locations in the Business & Location Management section.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">Business Location / Facility</th>
                      <th className="p-2.5">Pollution Tier</th>
                      <th className="p-2.5 text-center">Active</th>
                      <th className="p-2.5 text-center">Overdue</th>
                      <th className="p-2.5 text-center">Completed</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {locations.map((loc) => {
                      const facMetric = metrics?.facilities?.find((f) => f.facility_id === loc.id);
                      const total = facMetric?.total || 0;
                      const overdue = facMetric?.overdue || 0;
                      const completed = facMetric?.completed || 0;

                      return (
                        <tr key={loc.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="p-2.5 font-semibold text-brand-charcoal">
                            <div>{loc.location_name}</div>
                            <div className="text-[10px] text-stone-400 font-normal">
                              {loc.address?.city || 'Facility'}, {loc.address?.state_code || ''}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-100 text-stone-700 border border-stone-200">
                              {loc.industrial_profile?.pollution_category || 'WHITE'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">{total}</td>
                          <td className="p-2.5 text-center font-mono">
                            {overdue > 0 ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                                {overdue}
                              </span>
                            ) : (
                              <span className="text-stone-400">0</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono text-emerald-700 font-semibold">
                            {completed}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={generatingForLoc === loc.id}
                              onClick={() => handleGenerateForFacility(loc.id)}
                              className="text-brand-deep-sage hover:bg-brand-pale-sage/50"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {generatingForLoc === loc.id ? 'Generating...' : total === 0 ? 'Generate Obligations' : 'Sync Profile'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Critical Obligations Upcoming / Overdue List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-amber" />
            Critical Compliance Pipeline (Upcoming & Overdue)
          </CardTitle>
          <Link
            to="/compliance/obligations"
            className="text-xs text-brand-deep-sage hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Full Obligation Registry</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="p-8 text-center text-stone-400 text-xs">Loading obligations...</div>
          ) : upcomingList.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded-lg">
              No active compliance obligations found. Click "Generate Obligations" on your business locations above or add a custom obligation.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {upcomingList.map((ob) => (
                <div
                  key={ob.id}
                  onClick={() => openObligationDetail(ob.id)}
                  className="p-3 hover:bg-stone-50/80 transition-colors flex items-center justify-between cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded-full bg-brand-deep-sage/40" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-brand-charcoal">
                          {ob.title}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 uppercase">
                          {ob.obligation_number}
                        </span>
                        {ob.source_verification_status === 'VERIFIED' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                            STATUTORY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                        <span>{ob.department_code}</span>
                        <span>•</span>
                        <span>Cycle #{ob.current_cycle_number}</span>
                        <span>•</span>
                        <span>{ob.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-xs font-semibold text-brand-charcoal">
                        {ob.due_date
                          ? new Date(ob.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Date Required'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {ob.days_until_due !== undefined ? (
                          ob.days_until_due < 0 ? (
                            <span className="text-rose-600 font-bold">
                              {Math.abs(ob.days_until_due)} days overdue
                            </span>
                          ) : ob.days_until_due === 0 ? (
                            <span className="text-amber-600 font-bold">Due today</span>
                          ) : (
                            <span>{ob.days_until_due} days left</span>
                          )
                        ) : null}
                      </div>
                    </div>
                    <div>{getStatusBadge(ob.status)}</div>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </div>
                </div>
              ))}
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
        onUpdated={loadComplianceDashboard}
      />

      <CustomObligationModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onCreated={loadComplianceDashboard}
      />
    </div>
  );
};
