import React, { useState, useEffect } from 'react';
import { jurisdictionAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Map,
  MapPin,
  Building,
  ChevronRight,
  GitFork,
  ArrowRight,
  CheckCircle2,
  Layers,
  Globe,
  Factory,
} from 'lucide-react';

export const JurisdictionExplorerPage = () => {
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [selectedState, setSelectedState] = useState(null);
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [selectedZone, setSelectedZone] = useState('ALL');

  // Load all 36 States & UTs on mount
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await jurisdictionAPI.getStates();
        if (res.data?.success) {
          setStates(res.data.data);
          // Auto-select Gujarat or first state
          const initial = res.data.data.find((s) => s.code === 'IN-GJ') || res.data.data[0];
          if (initial) {
            handleSelectState(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load national jurisdictions:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  const handleSelectState = async (stateDoc) => {
    setSelectedState(stateDoc);
    setSelectedNode(null);
    setHierarchy(null);
    setLoadingChildren(true);
    try {
      const res = await jurisdictionAPI.getChildren(stateDoc.code);
      if (res.data?.success) {
        setChildren(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load state sub-jurisdictions:', err);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleSelectChild = async (childDoc) => {
    setSelectedNode(childDoc);
    setLoadingHierarchy(true);
    try {
      const res = await jurisdictionAPI.getHierarchy(childDoc.code);
      if (res.data?.success) {
        setHierarchy(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch node hierarchy:', err);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const zones = ['ALL', 'WEST', 'SOUTH', 'NORTH', 'EAST', 'CENTRAL', 'NORTHEAST', 'ISLANDS'];

  const filteredStates = selectedZone === 'ALL'
    ? states
    : states.filter((s) => s.zone === selectedZone);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Map className="w-5 h-5 text-brand-deep-sage" />
            <h1 className="text-xl font-bold text-brand-charcoal">
              National Jurisdiction & Territorial Explorer
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Database-driven administrative geography covering all 28 Indian States, 8 Union Territories, sub-districts, and industrial development corridors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">All 36 States & UTs</Badge>
          <Badge variant="warning">Central Root (IN)</Badge>
        </div>
      </div>

      {/* Zone Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-lg border border-stone-200">
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setSelectedZone(zone)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              selectedZone === zone
                ? 'bg-brand-deep-sage text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {zone} {zone !== 'ALL' && `(${states.filter((s) => s.zone === zone).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: States & UTs Grid */}
        <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
              States & Union Territories ({filteredStates.length})
            </h2>
            <span className="text-[10px] text-stone-400 font-mono">ISO-3166-2:IN</span>
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-1">
            {filteredStates.map((st) => {
              const isSelected = selectedState?.code === st.code;
              return (
                <div
                  key={st.code}
                  onClick={() => handleSelectState(st)}
                  className={`p-2.5 rounded-md border text-xs flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-brand-deep-sage text-white border-brand-deep-sage font-semibold'
                      : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {st.code}
                    </span>
                    <span>{st.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={isSelected ? 'text-white/80' : 'text-stone-400'}>
                      {st.capital || st.tier}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sub-jurisdictions & Lineage Traversal */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub-Districts & Industrial Enclaves */}
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal">
                  {selectedState ? `${selectedState.name} (${selectedState.code})` : 'Select a State'}
                </h3>
                <span className="text-[11px] text-stone-500">
                  Subordinate Districts, Municipal Corporations & Industrial Parks
                </span>
              </div>
              {selectedState && (
                <Badge variant={selectedState.tier === 'UT' ? 'warning' : 'default'}>
                  {selectedState.tier === 'UT' ? 'Union Territory' : 'State'}
                </Badge>
              )}
            </div>

            {loadingChildren ? (
              <div className="p-8 text-center text-stone-400 text-xs">Loading territorial divisions...</div>
            ) : children.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs bg-stone-50 rounded border border-stone-100">
                Centralized state administration. Specialized enclaves can be registered by administrators.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {children.map((child) => {
                  const isNodeSelected = selectedNode?.code === child.code;
                  return (
                    <div
                      key={child.code}
                      onClick={() => handleSelectChild(child)}
                      className={`p-3 rounded-md border text-xs cursor-pointer transition flex flex-col justify-between ${
                        isNodeSelected
                          ? 'bg-brand-pale-sage border-brand-sage text-brand-charcoal font-semibold'
                          : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">
                            {child.code}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                            {child.tier}
                          </span>
                        </div>
                        <div className="font-semibold">{child.name}</div>
                      </div>
                      <div className="mt-2 text-[10px] text-brand-deep-sage flex items-center gap-1 font-medium">
                        View Complete Lineage <ArrowRight className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lineage Tree Hierarchy */}
          {selectedNode && (
            <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-brand-deep-sage" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                    Territorial Lineage Hierarchy
                  </h4>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">
                  Depth: {hierarchy?.depth || 0} Tiers
                </span>
              </div>

              {loadingHierarchy ? (
                <div className="p-4 text-center text-xs text-stone-400">Loading hierarchy...</div>
              ) : hierarchy?.lineage?.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-stone-500 mb-2">
                    Lineage path from National Federal Sovereign down to specific industrial enclave:
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    {hierarchy.lineage.map((anc, idx) => (
                      <div key={anc.code} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-deep-sage text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 p-2 bg-stone-50 rounded border border-stone-200 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-brand-charcoal">{anc.name}</span>
                            <span className="text-[10px] font-mono text-stone-400 ml-2">({anc.code})</span>
                          </div>
                          <Badge variant={anc.tier === 'CENTRAL' ? 'warning' : 'outline'}>
                            {anc.tier}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-brand-cream/60 rounded border border-stone-200 mt-3 text-xs text-stone-600">
                    <span className="font-bold text-brand-charcoal">Applicable Jurisdiction Bound: </span>
                    Facilities sited in <span className="font-semibold">{selectedNode.name}</span> are subject to municipal/estate regulations of {selectedNode.code}, the statutory laws of {selectedState?.name}, and Union Central Acts.
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
