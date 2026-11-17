import React, { useState, useEffect } from 'react';
import { kyaAPI, jurisdictionAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Compass,
  ArrowRight,
  Clock,
  Coins,
  FileCheck2,
  AlertCircle,
  Flame,
  Zap,
  Users,
  Droplets,
  Layers,
  ChevronDown,
  CheckCircle,
  ExternalLink,
  Info,
  Building,
} from 'lucide-react';

export const KYAEvaluatorPage = () => {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Form inputs
  const [formData, setFormData] = useState({
    state_code: 'IN-GJ',
    district_code: '',
    scale: 'MEDIUM',
    pollution_category: 'ORANGE',
    workforce_capacity: 50,
    total_power_load_hp: 100,
    has_boiler: false,
    has_hazardous_chemicals: false,
    has_groundwater_borewell: false,
  });

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

  // When state changes, fetch sub-districts/enclaves dynamically
  useEffect(() => {
    if (!formData.state_code) {
      setDistricts([]);
      return;
    }
    const fetchChildren = async () => {
      setLoadingDistricts(true);
      try {
        const res = await jurisdictionAPI.getChildren(formData.state_code);
        if (res.data?.success) {
          setDistricts(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, district_code: res.data.data[0].code }));
          } else {
            setFormData((prev) => ({ ...prev, district_code: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchChildren();
  }, [formData.state_code]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEvaluate = async (e) => {
    e?.preventDefault();
    setEvaluating(true);
    try {
      const payload = {
        state_code: formData.state_code,
        district_code: formData.district_code || undefined,
        scale: formData.scale,
        pollution_category: formData.pollution_category,
        workforce_capacity: Number(formData.workforce_capacity),
        total_power_load_hp: Number(formData.total_power_load_hp),
        has_boiler: Boolean(formData.has_boiler),
        has_hazardous_chemicals: Boolean(formData.has_hazardous_chemicals),
        has_groundwater_borewell: Boolean(formData.has_groundwater_borewell),
      };

      const res = await kyaAPI.evaluate(payload);
      if (res.data?.success) {
        setEvaluationResult(res.data.data);
      }
    } catch (err) {
      console.error('KYA evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  // Run initial evaluation on mount once states are loaded
  useEffect(() => {
    if (states.length > 0 && !evaluationResult) {
      handleEvaluate();
    }
  }, [states]);

  const getPollutionColor = (cat) => {
    switch (cat) {
      case 'RED':
        return 'text-rose-700 bg-rose-50 border-rose-300';
      case 'ORANGE':
        return 'text-amber-700 bg-amber-50 border-amber-300';
      case 'GREEN':
        return 'text-emerald-700 bg-emerald-50 border-emerald-300';
      case 'WHITE':
        return 'text-stone-700 bg-stone-100 border-stone-300';
      default:
        return 'text-stone-700 bg-stone-50 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-brand-deep-sage" />
            <h1 className="text-xl font-bold text-brand-charcoal">
              Know Your Approvals (KYA) Roadmap Engine
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Deterministic rule-based statutory clearance roadmap tailored to your specific business location, industry scale, pollution index, and utility profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Parameter Input Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="text-sm font-bold text-brand-charcoal">Business Establishment Parameters</h2>
            <span className="text-[10px] uppercase font-mono text-stone-400 font-bold">Rule Engine Input</span>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            {/* State Selection */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                State / Union Territory <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white"
                value={formData.state_code}
                onChange={(e) => handleInputChange('state_code', e.target.value)}
              >
                {states.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                District / Industrial Zone
              </label>
              <select
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white"
                value={formData.district_code}
                disabled={loadingDistricts || districts.length === 0}
                onChange={(e) => handleInputChange('district_code', e.target.value)}
              >
                {districts.length === 0 ? (
                  <option value="">No sub-zones listed (Default State Jurisdiction)</option>
                ) : (
                  districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.tier})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Enterprise Scale & Pollution Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Enterprise Scale</label>
                <select
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white"
                  value={formData.scale}
                  onChange={(e) => handleInputChange('scale', e.target.value)}
                >
                  <option value="MICRO">Micro Unit</option>
                  <option value="SMALL">Small Enterprise</option>
                  <option value="MEDIUM">Medium Enterprise</option>
                  <option value="LARGE">Large / Mega Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pollution Category</label>
                <select
                  className={`w-full px-3 py-2 text-xs border rounded-md focus:outline-none focus:border-brand-deep-sage font-medium ${getPollutionColor(formData.pollution_category)}`}
                  value={formData.pollution_category}
                  onChange={(e) => handleInputChange('pollution_category', e.target.value)}
                >
                  <option value="RED">Red (Heavy Pollution)</option>
                  <option value="ORANGE">Orange (Medium Impact)</option>
                  <option value="GREEN">Green (Low Impact)</option>
                  <option value="WHITE">White (Exempted)</option>
                </select>
              </div>
            </div>

            {/* Workforce & Connected Power Load */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-stone-400" /> Total Workers
                </label>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage"
                  value={formData.workforce_capacity}
                  onChange={(e) => handleInputChange('workforce_capacity', e.target.value)}
                />
                <span className="text-[10px] text-stone-400 font-mono">Factories Act triggers at 10+</span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-stone-400" /> Connected Load (HP)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage"
                  value={formData.total_power_load_hp}
                  onChange={(e) => handleInputChange('total_power_load_hp', e.target.value)}
                />
                <span className="text-[10px] text-stone-400 font-mono">HT Inspection triggers at 100+ HP</span>
              </div>
            </div>

            {/* Special Regulatory Toggles */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="block font-semibold text-stone-700 mb-1">
                Statutory Hazard & Utility Triggers
              </label>

              <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100">
                <input
                  type="checkbox"
                  checked={formData.has_boiler}
                  onChange={(e) => handleInputChange('has_boiler', e.target.checked)}
                  className="rounded text-brand-deep-sage focus:ring-brand-deep-sage"
                />
                <div className="flex-1">
                  <div className="font-semibold text-stone-800">Industrial Steam Boiler / Pressure Vessel</div>
                  <div className="text-[10px] text-stone-500">Triggers Indian Boilers Act (IBR 1923)</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100">
                <input
                  type="checkbox"
                  checked={formData.has_hazardous_chemicals}
                  onChange={(e) => handleInputChange('has_hazardous_chemicals', e.target.checked)}
                  className="rounded text-brand-deep-sage focus:ring-brand-deep-sage"
                />
                <div className="flex-1">
                  <div className="font-semibold text-stone-800">Petroleum or Hazardous Chemicals Storage</div>
                  <div className="text-[10px] text-stone-500">Triggers PESO Licensing & MSIHC Schedule</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100">
                <input
                  type="checkbox"
                  checked={formData.has_groundwater_borewell}
                  onChange={(e) => handleInputChange('has_groundwater_borewell', e.target.checked)}
                  className="rounded text-brand-deep-sage focus:ring-brand-deep-sage"
                />
                <div className="flex-1">
                  <div className="font-semibold text-stone-800">Subsurface Groundwater Borewell Extraction</div>
                  <div className="text-[10px] text-stone-500">Triggers CGWA Ground Water NOC</div>
                </div>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={evaluating}>
              {evaluating ? 'Evaluating Statutes...' : 'Evaluate Applicable Approvals'}
            </Button>
          </form>
        </div>

        {/* Right Output Roadmap */}
        <div className="lg:col-span-7 space-y-5">
          {evaluating ? (
            <div className="bg-white p-12 text-center rounded-lg border border-stone-200 animate-pulse">
              <Compass className="w-8 h-8 text-brand-deep-sage animate-spin mx-auto mb-3" />
              <div className="text-sm font-bold text-brand-charcoal">Evaluating prevailing state & central statutes...</div>
              <div className="text-xs text-stone-400 mt-1">Cross-referencing CPCB, State PCB, PESO, and DISH rules</div>
            </div>
          ) : !evaluationResult ? (
            <div className="bg-white p-12 text-center rounded-lg border border-stone-200">
              <Compass className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-brand-charcoal">Ready to evaluate</div>
              <div className="text-xs text-stone-500 mt-1">Select your business location profile and click Evaluate.</div>
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block">
                    Statutory Approvals
                  </span>
                  <span className="text-2xl font-bold font-mono text-brand-deep-sage block mt-1">
                    {evaluationResult.total_approvals_required}
                  </span>
                  <span className="text-[10px] text-stone-500">Across 3 project stages</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block">
                    Cumulative SLA
                  </span>
                  <span className="text-2xl font-bold font-mono text-brand-charcoal block mt-1 flex items-baseline gap-1">
                    {evaluationResult.estimated_cumulative_sla_days} <span className="text-xs font-normal text-stone-500">days</span>
                  </span>
                  <span className="text-[10px] text-stone-500">Working days SLA total</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                  <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block">
                    Estimated Govt Fees
                  </span>
                  <span className="text-2xl font-bold font-mono text-brand-amber block mt-1">
                    ₹{(evaluationResult.estimated_total_statutory_fees_inr || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-stone-500">Base statutory portal fee</span>
                </div>
              </div>

              {/* Stage-wise Clearance Roadmap */}
              <div className="space-y-4">
                {/* 1. Pre-Establishment */}
                <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-brand-pale-sage/40 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-deep-sage text-white text-[11px] font-mono font-bold flex items-center justify-center">
                        1
                      </span>
                      <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                        Stage 1: Pre-Establishment Clearances ({evaluationResult.stages?.PRE_ESTABLISHMENT?.length || 0})
                      </h3>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">Prior to physical civil construction</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {evaluationResult.stages?.PRE_ESTABLISHMENT?.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No pre-establishment clearances triggered for this profile.</p>
                    ) : (
                      evaluationResult.stages?.PRE_ESTABLISHMENT?.map((item) => (
                        <div key={item.approval_code} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold">
                                {item.approval_code} • {item.department_code}
                              </div>
                              <h4 className="text-xs font-bold text-brand-charcoal">{item.title}</h4>
                            </div>
                            <Badge variant={item.authority_level === 'CENTRAL' ? 'warning' : 'default'}>
                              {item.authority_level}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            {item.matching_reasons?.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                                <CheckCircle className="w-3.5 h-3.5 text-brand-sage shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-mono">SLA: {item.standard_sla_days} days • Fee: ₹{item.estimated_fee_inr?.toLocaleString('en-IN')}</span>
                            {item.official_portal_url && (
                              <a
                                href={item.official_portal_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-deep-sage hover:underline flex items-center gap-1 font-semibold"
                              >
                                Portal <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Pre-Operation */}
                <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-brand-cream/80 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-walnut text-white text-[11px] font-mono font-bold flex items-center justify-center">
                        2
                      </span>
                      <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                        Stage 2: Pre-Operation Clearances ({evaluationResult.stages?.PRE_OPERATION?.length || 0})
                      </h3>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">Prior to commissioning & commercial trial</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {evaluationResult.stages?.PRE_OPERATION?.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No pre-operation clearances triggered for this profile.</p>
                    ) : (
                      evaluationResult.stages?.PRE_OPERATION?.map((item) => (
                        <div key={item.approval_code} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold">
                                {item.approval_code} • {item.department_code}
                              </div>
                              <h4 className="text-xs font-bold text-brand-charcoal">{item.title}</h4>
                            </div>
                            <Badge variant={item.authority_level === 'CENTRAL' ? 'warning' : 'default'}>
                              {item.authority_level}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            {item.matching_reasons?.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                                <CheckCircle className="w-3.5 h-3.5 text-brand-sage shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-mono">SLA: {item.standard_sla_days} days • Fee: ₹{item.estimated_fee_inr?.toLocaleString('en-IN')}</span>
                            {item.official_portal_url && (
                              <a
                                href={item.official_portal_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-deep-sage hover:underline flex items-center gap-1 font-semibold"
                              >
                                Portal <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Operational Stage */}
                <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-stone-100 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-charcoal text-white text-[11px] font-mono font-bold flex items-center justify-center">
                        3
                      </span>
                      <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                        Stage 3: Operational & Periodic Obligations ({evaluationResult.stages?.OPERATIONAL?.length || 0})
                      </h3>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">Annual renewals & returns</span>
                  </div>

                  <div className="p-4 space-y-3">
                    {evaluationResult.stages?.OPERATIONAL?.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">Annual returns and compliance calendar obligations apply upon commercial launch.</p>
                    ) : (
                      evaluationResult.stages?.OPERATIONAL?.map((item) => (
                        <div key={item.approval_code} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold">
                                {item.approval_code} • {item.department_code}
                              </div>
                              <h4 className="text-xs font-bold text-brand-charcoal">{item.title}</h4>
                            </div>
                            <Badge variant={item.authority_level === 'CENTRAL' ? 'warning' : 'default'}>
                              {item.authority_level}
                            </Badge>
                          </div>
                          <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-mono">SLA: {item.standard_sla_days} days</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="p-4 bg-brand-pale-sage/40 rounded-lg border border-brand-sage/40 flex items-start gap-3">
                <Info className="w-4 h-4 text-brand-deep-sage shrink-0 mt-0.5" />
                <div className="text-[11px] text-stone-600 leading-relaxed">
                  <span className="font-bold text-brand-deep-sage">Statutory Disclaimer: </span>
                  {evaluationResult.disclaimer}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
