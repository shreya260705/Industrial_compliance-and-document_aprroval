import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  History,
  FileCheck,
  ArrowRight,
  ShieldAlert,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { schemeAPI, facilitiesAPI, schemeApplicationAPI } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchemeRecommendationsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedScheme = searchParams.get('scheme');

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [recommendations, setRecommendations] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(null);

  // Expanded criteria view
  const [expandedCards, setExpandedCards] = useState({});

  // History tab
  const [viewHistory, setViewHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // 1. Fetch businesses & locations
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      setError(null);
      try {
        const facilityResponse = await facilitiesAPI.list();
        const allLocs = facilityResponse.data?.data || [];
        setLocations(allLocs);

        if (allLocs.length > 0) {
          setSelectedLocationId(allLocs[0].id);
        } else {
          setSelectedLocationId('');
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        setLocations([]);
        setSelectedLocationId('');
        setError(err.response?.data?.error?.message || err.message || 'Failed to load your industrial facility locations.');
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // 2. Fetch existing recommendations when location changes
  useEffect(() => {
    setViewHistory(false);
    setHistoryList([]);
    setHistoryError(null);
    if (!selectedLocationId) {
      setRecommendations([]);
      return;
    }

    const fetchRecs = async () => {
      setLoadingRecs(true);
      setError(null);
      try {
        const res = await schemeAPI.getRecommendations({
          location_id: selectedLocationId,
          is_latest: true
        });
        setRecommendations(res.data?.data?.recommendations || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err.response?.data?.error?.message || err.message || 'Failed to load recommendations.');
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecs();
  }, [selectedLocationId]);

  // 3. Trigger evaluation
  const handleEvaluate = async () => {
    if (!selectedLocationId) return;
    setEvaluating(true);
    setError(null);
    try {
      const payload = { location_id: selectedLocationId };
      if (preselectedScheme) {
        payload.scheme_code = preselectedScheme;
      }
      await schemeAPI.evaluate(payload);
      // Refresh recommendations
      const res = await schemeAPI.getRecommendations({
        location_id: selectedLocationId,
        is_latest: true
      });
      setRecommendations(res.data?.data?.recommendations || []);
    } catch (err) {
      console.error('Evaluation error:', err);
      setError(err.response?.data?.error?.message || 'Eligibility evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  // 4. Fetch history
  const handleToggleHistory = async () => {
    if (viewHistory) {
      setViewHistory(false);
      return;
    }
    if (!selectedLocationId) return;

    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await schemeAPI.getRecommendations({
        location_id: selectedLocationId,
        history: true
      });
      setHistoryList(res.data?.data?.recommendations || []);
      setViewHistory(true);
    } catch (err) {
      console.error('Error loading history:', err);
      setHistoryError(err.response?.data?.error?.message || err.message || 'Failed to load evaluation history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 5. Start Application Dossier
  const handleStartApplication = async (schemeCode, recId) => {
    try {
      const res = await schemeApplicationAPI.create({
        location_id: selectedLocationId,
        scheme_code: schemeCode,
        recommendation_id: recId
      });
      const appId = res.data?.data?.application?.id;
      navigate(`/scheme-applications/${appId}`);
    } catch (err) {
      console.error('Error creating application:', err);
      alert(err.response?.data?.error?.message || 'Failed to initialize scheme application dossier.');
    }
  };

  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getOverallBadge = (status) => {
    switch (status) {
      case 'ELIGIBLE':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2 py-0.5">ELIGIBLE</Badge>;
      case 'INELIGIBLE':
        return <Badge variant="danger" className="bg-rose-100 text-rose-800 border-rose-300 font-bold px-2 py-0.5">INELIGIBLE</Badge>;
      case 'NEEDS_MANUAL_REVIEW':
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-2 py-0.5">NEEDS MANUAL REVIEW</Badge>;
      case 'MISSING_EVIDENCE':
        return <Badge variant="draft" className="bg-stone-200 text-stone-800 border-stone-300 font-bold px-2 py-0.5">MISSING EVIDENCE</Badge>;
      default:
        return <Badge variant="draft">{status}</Badge>;
    }
  };

  const getCriterionIcon = (status) => {
    switch (status) {
      case 'SATISFIED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'UNMET':
        return <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'MISSING_EVIDENCE':
        return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'MANUAL_CONFIRMATION_REQUIRED':
        return <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/schemes" className="text-xs text-stone-500 hover:text-brand-deep-sage font-mono">
              Catalogue
            </Link>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-amber">
              Location-Specific Evaluator
            </span>
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-amber" />
            Deterministic Scheme Eligibility Recommendations
          </h1>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl">
            Evaluated per physical business location. Each criterion is tested with verified boolean rules and explicit statutory citations. Missing evidence is never treated as satisfied.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleToggleHistory}
            disabled={loadingLocations || !selectedLocationId || loadingHistory}
            className="text-xs flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-stone-500" />
            <span>{viewHistory ? 'Hide Evaluation History' : 'View Audit History'}</span>
          </Button>
          <Button
            onClick={handleEvaluate}
            disabled={evaluating || !selectedLocationId}
            className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-4 flex items-center gap-2"
          >
            {evaluating ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-brand-amber" />
                <span>Run Eligibility Engine</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Facility Selector Card */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-pale-sage text-brand-deep-sage">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-stone-500">
              Select Industrial Facility Location
            </label>
            {loadingLocations ? (
              <span className="text-xs text-stone-400">Loading locations...</span>
            ) : locations.length === 0 ? (
              <span className="text-xs text-rose-600">No industrial locations found. Please add a facility first.</span>
            ) : (
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="mt-0.5 border border-stone-200 rounded px-3 py-1.5 text-xs font-semibold text-brand-charcoal bg-stone-50/50 focus:border-brand-deep-sage outline-none min-w-[280px]"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.address?.state_code || 'IN-XX'}) — {loc.businessName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {preselectedScheme && (
          <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-amber shrink-0" />
            <span>Targeting scheme: <strong>{preselectedScheme}</strong></span>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {historyError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-700">
          {historyError}
        </div>
      )}

      {/* History Drawer / Modal */}
      {viewHistory && (
        <div className="bg-stone-50 p-5 rounded-xl border border-stone-300 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h3 className="text-xs font-mono uppercase font-bold text-brand-charcoal flex items-center gap-2">
              <History className="h-4 w-4 text-brand-amber" />
              Append-Only Evaluation Audit History
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">
              Immutable snapshots with SHA-256 hashes
            </span>
          </div>

          {loadingHistory ? (
            <div className="py-6 text-center text-xs text-stone-500">Loading history snapshots...</div>
          ) : historyList.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-500">No historical evaluation records found.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {historyList.map(h => (
                <div key={h.id} className="bg-white p-3 rounded border border-stone-200 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-stone-800 flex items-center gap-2">
                      <span>{h.scheme_code}</span>
                      {getOverallBadge(h.overall_eligibility)}
                      {h.is_latest ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-semibold">Active Latest</span>
                      ) : (
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded font-mono">Superseded</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">
                      Evaluated: {new Date(h.evaluated_at).toLocaleString()} • Snapshot Hash: {h.profile_snapshot_hash?.slice(0, 16)}...
                    </div>
                  </div>
                  {h.invalidation_reason && (
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      Reason: {h.invalidation_reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations List */}
      {loadingRecs ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage mx-auto mb-3"></div>
          <p className="text-xs text-stone-500">Retrieving location eligibility evaluations...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-stone-200 space-y-3">
          <Sparkles className="h-8 w-8 text-brand-amber mx-auto" />
          <h4 className="text-sm font-bold text-brand-charcoal">No evaluations found for this facility</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Click <strong>Run Eligibility Engine</strong> above to execute deterministic statutory criteria evaluation for this business location.
          </p>
          <Button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="bg-brand-deep-sage text-white text-xs px-4"
          >
            Evaluate Facility Now
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
            <span>Evaluated Schemes ({recommendations.length})</span>
            <span className="font-mono text-[11px]">Engine Version: 2026.1</span>
          </div>

          {recommendations.map(rec => {
            const isExpanded = expandedCards[rec.id] ?? true;
            return (
              <Card key={rec.id} className="border-stone-200 overflow-hidden shadow-xs">
                {/* Recommendation Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage">
                        {rec.scheme_code}
                      </span>
                      {getOverallBadge(rec.overall_eligibility)}
                      {rec.financial_instrument_type === 'CREDIT_GUARANTEE' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Credit Guarantee (Non-Subsidy)
                        </span>
                      )}
                      {rec.is_stale && (
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                          Stale: {rec.invalidation_reason || 'Profile updated'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-brand-charcoal">
                      {rec.scheme_name || rec.scheme_code}
                    </h3>
                    <div className="text-[11px] font-mono text-stone-400">
                      Evaluated: {new Date(rec.evaluated_at).toLocaleString()} • Snapshot: {rec.profile_snapshot_hash?.slice(0, 16)}...
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rec.overall_eligibility === 'ELIGIBLE' && rec.fresh_intake_status === 'OPEN' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartApplication(rec.scheme_code, rec.id)}
                        className="bg-brand-deep-sage hover:bg-brand-deep-sage/90 text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        <span>Start Application Dossier</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCard(rec.id)}
                      className="text-xs py-1.5 text-stone-600"
                    >
                      {isExpanded ? (
                        <>
                          <span>Hide Details</span>
                          <ChevronUp className="h-3.5 w-3.5 ml-1" />
                        </>
                      ) : (
                        <>
                          <span>View {rec.criteria_results?.length || 0} Criteria</span>
                          <ChevronDown className="h-3.5 w-3.5 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Criteria Breakdown */}
                {isExpanded && (
                  <div className="bg-stone-50/50 p-5 space-y-4">
                    <div className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                      Deterministic Criteria Evaluation Breakdown
                    </div>

                    <div className="space-y-2.5">
                      {rec.criteria_results?.map((crit, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-3.5 rounded-lg border border-stone-200/80 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              {getCriterionIcon(crit.status)}
                              <div>
                                <div className="text-xs font-bold text-brand-charcoal">{crit.label}</div>
                                <div className="text-[10px] font-mono text-stone-400">{crit.statutory_reference}</div>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono font-bold">
                              {crit.status === 'SATISFIED' && <span className="text-emerald-700">SATISFIED</span>}
                              {crit.status === 'UNMET' && <span className="text-rose-700">UNMET</span>}
                              {crit.status === 'MISSING_EVIDENCE' && <span className="text-amber-700">MISSING EVIDENCE</span>}
                              {crit.status === 'MANUAL_CONFIRMATION_REQUIRED' && <span className="text-blue-700">MANUAL REVIEW</span>}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded border border-stone-100">
                            <div>
                              <span className="text-stone-400 font-semibold block text-[10px]">Required Statutory Condition:</span>
                              <span className="text-stone-700 font-medium">{crit.required_value}</span>
                            </div>
                            <div>
                              <span className="text-stone-400 font-semibold block text-[10px]">Facility Actual Attribute:</span>
                              <span className="text-stone-700 font-medium">{crit.actual_value}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-stone-600 pl-6 border-l-2 border-stone-200">
                            {crit.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary Snippet */}
                    {rec.financial_summary && Object.keys(rec.financial_summary).length > 0 && (
                      <div className="bg-brand-cream/60 p-3.5 rounded-lg border border-stone-200/70 text-xs space-y-1">
                        <div className="font-bold text-brand-charcoal text-[11px] uppercase tracking-wider font-mono">
                          Financial Assessment & Limits
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                          {Object.entries(rec.financial_summary).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-stone-500 capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                              <strong className="text-stone-800">{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
