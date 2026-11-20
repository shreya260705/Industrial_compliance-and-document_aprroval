import React, { useState, useEffect } from 'react';
import { useFacility } from '../context/FacilityContext';
import { locationAPI, jurisdictionAPI } from '../services/api';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Factory,
  Plus,
  Compass,
  MapPin,
  Flame,
  Droplets,
  AlertOctagon,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Trash2,
  Building2,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { BusinessManagerModal } from '../components/business/BusinessManagerModal';

export const FacilitiesPage = () => {
  const {
    businesses,
    currentBusiness,
    locations,
    currentLocation,
    setCurrentLocation,
    createLocation,
    refreshLocations,
    isLoadingFacilities,
    facilityError,
  } = useFacility();

  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluatingLocId, setEvaluatingLocId] = useState(null);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [evaluationError, setEvaluationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for New Facility
  const [formData, setFormData] = useState({
    location_name: '',
    facility_type: 'MANUFACTURING_PLANT',
    operational_status: 'PROPOSED',
    address: {
      plot_number: '',
      industrial_zone: '',
      city: '',
      district: '',
      state_code: 'IN-MH',
      pincode: '',
    },
    jurisdiction_hierarchy: {
      state_code: 'IN-MH',
      district_code: '',
      local_body_code: '',
    },
    industrial_profile: {
      nic_code: '2011',
      sector_name: 'Chemicals & Chemical Products',
      scale: 'MEDIUM',
      pollution_category: 'RED',
      total_builtup_area_sqm: 4500,
      plot_area_sqm: 10000,
      total_power_load_hp: 250,
      water_requirement_kld: 35,
      workforce_capacity: 120,
      has_boiler: false,
      has_hazardous_chemicals: true,
      has_groundwater_borewell: false,
      diesel_generator_capacity_kva: 125,
    },
  });

  // Load States on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await jurisdictionAPI.getStates();
        if (res.data?.success) {
          setStates(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch states:', err);
      }
    };
    fetchStates();
  }, []);

  // Fetch Districts when state changes in the add form
  useEffect(() => {
    const stateCode = formData.jurisdiction_hierarchy.state_code;
    if (!stateCode) return;

    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const res = await jurisdictionAPI.getChildren(stateCode);
        if (res.data?.success) {
          const list = res.data.data;
          setDistricts(list);
          if (list.length > 0) {
            setFormData((prev) => ({
              ...prev,
              address: { ...prev.address, district: list[0].name, state_code: stateCode },
              jurisdiction_hierarchy: {
                ...prev.jurisdiction_hierarchy,
                district_code: list[0].code,
              },
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, [formData.jurisdiction_hierarchy.state_code]);

  const handleStateChange = (stateCode) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, state_code: stateCode },
      jurisdiction_hierarchy: { ...prev.jurisdiction_hierarchy, state_code: stateCode },
    }));
  };

  const handleDistrictChange = (districtCode) => {
    const distObj = districts.find((d) => d.code === districtCode);
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, district: distObj ? distObj.name : '' },
      jurisdiction_hierarchy: { ...prev.jurisdiction_hierarchy, district_code: districtCode },
    }));
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (!currentBusiness) {
      setSubmitError('Please select or register an enterprise first.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await createLocation(currentBusiness.id, formData);
      setIsAddFacilityOpen(false);
      setFormData({
        location_name: '',
        facility_type: 'MANUFACTURING_PLANT',
        operational_status: 'PROPOSED',
        address: {
          plot_number: '',
          industrial_zone: '',
          city: '',
          district: '',
          state_code: 'IN-MH',
          pincode: '',
        },
        jurisdiction_hierarchy: {
          state_code: 'IN-MH',
          district_code: '',
          local_body_code: '',
        },
        industrial_profile: {
          nic_code: '2011',
          sector_name: 'Chemicals & Chemical Products',
          scale: 'MEDIUM',
          pollution_category: 'RED',
          total_builtup_area_sqm: 4500,
          plot_area_sqm: 10000,
          total_power_load_hp: 250,
          water_requirement_kld: 35,
          workforce_capacity: 120,
          has_boiler: false,
          has_hazardous_chemicals: true,
          has_groundwater_borewell: false,
          diesel_generator_capacity_kva: 125,
        },
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to register facility.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluateLocation = async (locationId) => {
    setEvaluatingLocId(locationId);
    setEvaluationError('');
    try {
      const res = await locationAPI.evaluate(locationId);
      if (res.data?.success) {
        setSelectedEvaluation({
          locationId,
          data: res.data.data,
        });
        refreshLocations();
      } else {
        setEvaluationError('The facility evaluation did not return a result.');
      }
    } catch (err) {
      console.error('Failed to evaluate location clearances:', err);
      setEvaluationError(err.response?.data?.error?.message || err.message || 'Failed to evaluate facility clearances.');
    } finally {
      setEvaluatingLocId(null);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to archive this industrial facility?')) return;
    try {
      await locationAPI.delete(locationId);
      refreshLocations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive facility.');
    }
  };

  const getPollutionBadge = (cat) => {
    switch (cat) {
      case 'RED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">RED CATEGORY</span>;
      case 'ORANGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">ORANGE CATEGORY</span>;
      case 'GREEN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">GREEN CATEGORY</span>;
      case 'WHITE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300">WHITE CATEGORY</span>;
      default:
        return <Badge size="xs">{cat}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6 text-brand-deep-sage" />
            <h1 className="text-xl font-bold text-brand-charcoal">Business & Location Management</h1>
            <Badge variant="demo">Phase 3</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Enterprise:{' '}
            <button
              onClick={() => setIsBizModalOpen(true)}
              className="font-bold text-brand-deep-sage underline hover:text-brand-walnut cursor-pointer inline-flex items-center gap-1"
            >
              {currentBusiness?.legal_name || 'Select Enterprise'}
              <ChevronRight className="h-3 w-3" />
            </button>{' '}
            • {locations.length} Business Location{locations.length === 1 ? '' : 's'} Registered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsBizModalOpen(true)}>
            <Building2 className="h-4 w-4 mr-1.5" /> Switch Enterprise
          </Button>
          <Button size="sm" onClick={() => setIsAddFacilityOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Register Business Location
          </Button>
        </div>
      </div>

      {facilityError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700">
          {facilityError}
        </div>
      )}

      {evaluationError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700">
          {evaluationError}
        </div>
      )}

      {/* Facilities Overview Cards / Grid */}
      {locations.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-brand-pale-sage text-brand-deep-sage rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-brand-charcoal">No Business Locations Registered</h3>
            <p className="text-xs text-stone-500 mt-1 mb-5">
              Add your manufacturing facilities, warehouses, processing centers, or commercial locations across India to discover state, central, and local approvals automatically.
            </p>
            <Button size="sm" onClick={() => setIsAddFacilityOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Register First Business Location
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {locations.map((loc) => {
            const prof = loc.industrial_profile || {};
            const addr = loc.address || {};
            const isEvaluating = evaluatingLocId === loc.id;
            const evalData = loc.kya_evaluation;

            return (
              <Card key={loc.id} className="border-stone-200/90 hover:border-brand-sage transition-all">
                <CardHeader className="p-4 pb-3 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-brand-charcoal">{loc.location_name}</h3>
                      {getPollutionBadge(prof.pollution_category)}
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-amber shrink-0" />
                      <span>
                        {addr.industrial_zone ? `${addr.industrial_zone}, ` : ''}
                        {addr.district}, {addr.state_code} – {addr.pincode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Badge size="xs" variant="default">
                      {loc.operational_status || 'PROPOSED'}
                    </Badge>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      title="Archive Facility"
                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardHeader>

                <CardBody className="p-4 space-y-4">
                  {/* Location Specs Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-brand-pale-sage/30 p-2 rounded border border-brand-sage/20">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Scale</div>
                      <div className="text-xs font-bold text-brand-deep-sage mt-0.5">{prof.scale || 'N/A'}</div>
                    </div>
                    <div className="bg-stone-50 p-2 rounded border border-stone-200">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Power Load</div>
                      <div className="text-xs font-bold text-stone-800 mt-0.5 font-mono">{prof.total_power_load_hp || 0} HP</div>
                    </div>
                    <div className="bg-stone-50 p-2 rounded border border-stone-200">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Workforce</div>
                      <div className="text-xs font-bold text-stone-800 mt-0.5 font-mono">{prof.workforce_capacity || 0} Pax</div>
                    </div>
                    <div className="bg-stone-50 p-2 rounded border border-stone-200">
                      <div className="text-[10px] uppercase font-bold text-stone-500">Water Req.</div>
                      <div className="text-xs font-bold text-stone-800 mt-0.5 font-mono">{prof.water_requirement_kld || 0} KLD</div>
                    </div>
                  </div>

                  {/* Statutory Triggers & Flags */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                      prof.has_boiler ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold' : 'bg-stone-50 text-stone-400 border-stone-200'
                    }`}>
                      <Flame className="h-3 w-3" /> Boiler: {prof.has_boiler ? 'Yes' : 'No'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                      prof.has_hazardous_chemicals ? 'bg-rose-50 text-rose-900 border-rose-300 font-semibold' : 'bg-stone-50 text-stone-400 border-stone-200'
                    }`}>
                      <AlertOctagon className="h-3 w-3" /> Hazmat: {prof.has_hazardous_chemicals ? 'Yes' : 'No'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                      prof.has_groundwater_borewell ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold' : 'bg-stone-50 text-stone-400 border-stone-200'
                    }`}>
                      <Droplets className="h-3 w-3" /> Borewell: {prof.has_groundwater_borewell ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* Sector & Jurisdiction Info */}
                  <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-200 space-y-1">
                    <div>
                      <strong className="text-stone-700">Sector / NIC:</strong> {prof.sector_name || 'Manufacturing'} (NIC: {prof.nic_code || 'N/A'})
                    </div>
                    <div>
                      <strong className="text-stone-700">Jurisdiction Codes:</strong> State: <span className="font-mono">{loc.jurisdiction_hierarchy?.state_code}</span> | Dist: <span className="font-mono">{loc.jurisdiction_hierarchy?.district_code || 'All'}</span>
                    </div>
                  </div>

                  {/* KYA Evaluation Roadmap Trigger & Status */}
                  <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {evalData ? (
                        <div className="text-xs">
                          <span className="font-bold text-brand-deep-sage">
                            {evalData.total_approvals_required ?? evalData.total_applicable_approvals ?? 0} Statutory Clearances Required
                          </span>
                          <span className="text-[10px] text-stone-400 block">
                            Evaluated: {new Date(loc.last_evaluated_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-stone-400 italic">Clearances not yet computed</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {evalData && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEvaluation({ locationId: loc.id, data: evalData })}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> View Roadmap
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={isEvaluating}
                        onClick={() => handleEvaluateLocation(loc.id)}
                      >
                        <Compass className="h-3.5 w-3.5 mr-1" /> Evaluate Clearances
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Evaluation Result Drawer / Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-stone-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-brand-amber" />
                <div>
                  <h3 className="font-bold text-sm">Location Statutory Compliance Roadmap</h3>
                  <p className="text-[11px] text-stone-200">
                    Jurisdiction: {selectedEvaluation.data.evaluated_parameters?.state_code || selectedEvaluation.data.state_code || 'India Wide'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-brand-pale-sage/40 rounded-lg border border-brand-sage/30 text-center">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Statutory Clearances
                  </span>
                  <span className="text-xl font-bold font-mono text-brand-deep-sage">
                    {selectedEvaluation.data.total_approvals_required ?? selectedEvaluation.data.total_applicable_approvals ?? 0}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Across Project Stages</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Cumulative SLA
                  </span>
                  <span className="text-xl font-bold font-mono text-brand-walnut">
                    {selectedEvaluation.data.estimated_cumulative_sla_days || 0} Days
                  </span>
                  <span className="text-[10px] text-stone-400 block">Standard Processing</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Estimated Fees
                  </span>
                  <span className="text-xl font-bold font-mono text-brand-amber">
                    ₹{(selectedEvaluation.data.estimated_total_statutory_fees_inr || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-400 block">Statutory Treasury Fees</span>
                </div>
              </div>

              {/* Approvals by Stages */}
              {selectedEvaluation.data.stages ? (
                Object.entries(selectedEvaluation.data.stages).map(([stageName, items]) => {
                  if (!items || items.length === 0) return null;
                  const stageLabels = {
                    PRE_ESTABLISHMENT: 'Stage 1: Pre-Establishment Clearances (Site, CTE & Siting)',
                    PRE_OPERATION: 'Stage 2: Pre-Operation Clearances (CTO, Factory License & NOCs)',
                    OPERATIONAL: 'Stage 3: Operational & Post-Commissioning Clearances'
                  };

                  return (
                    <div key={stageName} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep-sage border-b border-stone-200 pb-1 flex items-center justify-between">
                        <span>{stageLabels[stageName] || stageName}</span>
                        <span className="text-[10px] font-mono font-normal text-stone-500">
                          {items.length} clearance{items.length === 1 ? '' : 's'}
                        </span>
                      </h4>

                      <div className="space-y-2">
                        {items.map((app) => (
                          <div key={app.approval_code} className="p-3 bg-stone-50/80 border border-stone-200 rounded-md text-xs space-y-1.5 hover:border-brand-sage transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-[10px] text-brand-deep-sage font-bold mr-2">[{app.approval_code}]</span>
                                <span className="font-bold text-brand-charcoal">{app.title || app.approval_name}</span>
                                <span className="text-[10px] text-stone-500 block mt-0.5">
                                  Authority: <strong className="text-stone-700">{app.issuing_department_code || app.department_code}</strong> ({app.tier})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  app.verification_status === 'VERIFIED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : app.verification_status === 'NEEDS_REVIEW'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/40'
                                }`}>
                                  {app.verification_status || 'VERIFIED'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-600 bg-white p-2 rounded border border-stone-150">
                              <span>Standard SLA: <strong>{app.standard_sla_days || app.sla_days || 'N/A'} days</strong></span>
                              <span>Statutory Fee: <strong>₹{(app.estimated_fee_inr || 0).toLocaleString()}</strong></span>
                              {app.statutory_act && (
                                <span className="truncate max-w-[320px]">Act: <em>{app.statutory_act}</em></span>
                              )}
                            </div>

                            {(app.matching_reasons?.length > 0 || app.rule_explanation) && (
                              <div className="text-[11px] text-stone-600 bg-brand-pale-sage/20 p-2 rounded border border-brand-sage/20">
                                <strong>Statutory Trigger:</strong>{' '}
                                {Array.isArray(app.matching_reasons) ? app.matching_reasons.join(', ') : app.rule_explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : null}

              {/* Statutory Disclaimer */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-[11px] text-amber-900 leading-relaxed">
                <strong>Statutory Notice:</strong> {selectedEvaluation.data.disclaimer || (
                  "BizPermit is an independent architectural prototype developed under SIH26130. " +
                  "This automated roadmap is generated deterministically based on prevailing official statutes, " +
                  "gazette notifications, and citizen charters. It does not constitute legal counsel or a guarantee of approval grant."
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
              <Button size="sm" onClick={() => setSelectedEvaluation(null)}>
                Close Roadmap
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {isAddFacilityOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-stone-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-brand-amber" />
                <div>
                  <h3 className="font-bold text-sm">Register New Industrial Facility</h3>
                  <p className="text-[11px] text-stone-200">
                    Enterprise: {currentBusiness?.legal_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFacilityOpen(false)}
                className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                  {submitError}
                </div>
              )}

              {/* Section 1: Facility Identity */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep-sage mb-2 border-b pb-1">
                  1. Business Location Identity & Type
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Business Location / Facility Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sanand Heavy Chemicals Unit 1"
                      value={formData.location_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location_name: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Facility Type</label>
                    <select
                      value={formData.facility_type}
                      onChange={(e) => setFormData((prev) => ({ ...prev, facility_type: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    >
                      <option value="MANUFACTURING_PLANT">Manufacturing Facility</option>
                      <option value="FACTORY">Factory</option>
                      <option value="WAREHOUSE">Warehouse / Logistics</option>
                      <option value="PROCESSING_UNIT">Processing Unit</option>
                      <option value="INDUSTRIAL_UNIT">Industrial Unit</option>
                      <option value="CORPORATE_OFFICE">Corporate Office</option>
                      <option value="OTHER">Other Facility</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Geographical Location & Jurisdiction */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep-sage mb-2 border-b pb-1">
                  2. Geographical Location & Jurisdiction
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      State / UT <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.jurisdiction_hierarchy.state_code}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    >
                      {states.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.name} ({st.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.jurisdiction_hierarchy.district_code}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={loadingDistricts}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage disabled:bg-stone-100"
                    >
                      {districts.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Industrial Zone / Estate</label>
                    <input
                      type="text"
                      placeholder="e.g. GIDC Sanand, MIDC Chakan"
                      value={formData.address.industrial_zone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, industrial_zone: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Plot Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot No. G-42"
                      value={formData.address.plot_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, plot_number: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmedabad"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, city: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 382170"
                      value={formData.address.pincode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, pincode: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Industrial & Environmental Parameters */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep-sage mb-2 border-b pb-1">
                  3. Industrial Scale, Load & Environmental Triggers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Enterprise Scale</label>
                    <select
                      value={formData.industrial_profile.scale}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: { ...prev.industrial_profile, scale: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    >
                      <option value="MICRO">Micro (&lt; ₹1 Cr / 5 Cr)</option>
                      <option value="SMALL">Small (&lt; ₹10 Cr / 50 Cr)</option>
                      <option value="MEDIUM">Medium (&lt; ₹50 Cr / 250 Cr)</option>
                      <option value="LARGE">Large Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Pollution Category</label>
                    <select
                      value={formData.industrial_profile.pollution_category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: { ...prev.industrial_profile, pollution_category: e.target.value },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    >
                      <option value="RED">RED (High Pollution)</option>
                      <option value="ORANGE">ORANGE (Medium Pollution)</option>
                      <option value="GREEN">GREEN (Low Pollution)</option>
                      <option value="WHITE">WHITE (Non-Polluting)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Power Load (HP)</label>
                    <input
                      type="number"
                      value={formData.industrial_profile.total_power_load_hp}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: {
                            ...prev.industrial_profile,
                            total_power_load_hp: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Workforce Capacity</label>
                    <input
                      type="number"
                      value={formData.industrial_profile.workforce_capacity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: {
                            ...prev.industrial_profile,
                            workforce_capacity: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                </div>

                {/* Statutory Checkbox Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.industrial_profile.has_boiler}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: {
                            ...prev.industrial_profile,
                            has_boiler: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-brand-deep-sage focus:ring-brand-sage"
                    />
                    <span>Has Industrial Boiler</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.industrial_profile.has_hazardous_chemicals}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: {
                            ...prev.industrial_profile,
                            has_hazardous_chemicals: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-brand-deep-sage focus:ring-brand-sage"
                    />
                    <span>Stores Hazardous Chemicals</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.industrial_profile.has_groundwater_borewell}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          industrial_profile: {
                            ...prev.industrial_profile,
                            has_groundwater_borewell: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-brand-deep-sage focus:ring-brand-sage"
                    />
                    <span>Groundwater Extraction Borewell</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddFacilityOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  Register Facility
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Workspace Modal */}
      <BusinessManagerModal
        isOpen={isBizModalOpen}
        onClose={() => setIsBizModalOpen(false)}
      />
    </div>
  );
};
