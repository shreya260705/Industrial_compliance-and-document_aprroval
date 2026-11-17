import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, Building2, MapPin, Award, Layers } from 'lucide-react';

export const IndiaMapVisual = () => {
  const [activeHub, setActiveHub] = useState('gujarat');

  // Key industrial hubs with geographical SVG coordinates (viewBox 0 0 600 680)
  const hubs = [
    {
      id: 'ncr',
      name: 'Delhi NCR Hub',
      city: 'Gurugram / Noida',
      state: 'National Capital Region',
      coords: { x: 260, y: 195 },
      tier: 'Central Oversight',
      tag: 'National HQ',
      color: '#344B3F',
    },
    {
      id: 'gujarat',
      name: 'Sanand Industrial Cluster',
      city: 'Ahmedabad / Dahej',
      state: 'Gujarat',
      coords: { x: 175, y: 295 },
      tier: 'State Pilot • Active',
      tag: 'Location #01 • 1,200 HP',
      color: '#87A96B',
      approval: 'GPCB Consent to Establish (CTE)',
      status: 'VERIFIED ACTIVE',
    },
    {
      id: 'maharashtra',
      name: 'Chakan Automotive Belt',
      city: 'Pune / Mumbai',
      state: 'Maharashtra',
      coords: { x: 205, y: 390 },
      tier: 'State Pilot • Active',
      tag: 'Tooling & Die Facility',
      color: '#5A3E2B',
      approval: 'MPCB Water & Air Consent',
      status: 'IN COMPLIANCE',
    },
    {
      id: 'tamilnadu',
      name: 'Hosur SIPCOT Hub',
      city: 'Hosur / Sriperumbudur',
      state: 'Tamil Nadu',
      coords: { x: 275, y: 550 },
      tier: 'State Pilot • Active',
      tag: 'Location #02 • Assembly',
      color: '#D5851F',
      approval: 'TNPCB Consent Renewal',
      status: 'DUE IN 45 DAYS',
    },
    {
      id: 'karnataka',
      name: 'Peenya Industrial Zone',
      city: 'Bengaluru',
      state: 'Karnataka',
      coords: { x: 245, y: 505 },
      tier: 'Mapped Framework',
      tag: 'R&D & Electronics',
      color: '#303A34',
    },
  ];

  const activeHubData = hubs.find((h) => h.id === activeHub) || hubs[1];

  return (
    <div className="relative w-full max-w-xl mx-auto select-none">
      {/* Decorative Outer Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-pale-sage/40 via-brand-cream to-brand-pale-sage/30 rounded-3xl -z-10 blur-xl transform scale-95" />

      {/* Main Container Card */}
      <div className="relative bg-white/90 backdrop-blur-sm border border-stone-200/90 rounded-2xl shadow-xl p-4 sm:p-6 overflow-hidden">
        {/* Subtle Top Metadata Bar */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-semibold text-brand-charcoal text-[11px] uppercase tracking-wider font-mono">
              National Industrial Grid • Active Telemetry
            </span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono hidden sm:inline-block">
            28 States + 8 UTs Indexed
          </span>
        </div>

        {/* SVG Map Canvas */}
        <div className="relative h-[380px] sm:h-[440px] w-full flex items-center justify-center">
          <svg
            viewBox="0 0 540 640"
            className="w-full h-full max-h-[440px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Interactive India Industrial Map"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E7EDE2" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#DDE6D6" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#344B3F" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#87A96B" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#D5851F" stopOpacity="0.8" />
              </linearGradient>

              {/* Grid Pattern */}
              <pattern id="gridPattern" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#D1D9CD" strokeWidth="0.5" strokeOpacity="0.6" />
              </pattern>
            </defs>

            {/* Background Geometric Grid */}
            <rect width="540" height="640" fill="url(#gridPattern)" />

            {/* Stylized Accurate India Contour Path */}
            <path
              d="M 230,55 
                 C 240,40 255,40 265,55 
                 C 275,70 290,85 305,95 
                 C 315,102 335,110 330,125 
                 C 320,135 305,140 295,150 
                 C 305,160 325,165 350,165 
                 C 370,165 390,175 405,170 
                 C 420,165 440,150 460,160 
                 C 480,170 495,190 495,210 
                 C 490,225 470,230 455,225 
                 C 445,220 435,230 435,245 
                 C 435,260 415,265 400,270 
                 C 390,275 375,275 370,290 
                 C 365,305 385,320 380,345 
                 C 375,370 365,395 350,420 
                 C 340,435 325,465 315,495 
                 C 305,525 295,555 285,585 
                 C 280,600 270,615 260,615 
                 C 255,615 250,600 245,585 
                 C 235,555 220,525 210,490 
                 C 200,455 190,420 185,390 
                 C 180,360 170,345 155,335 
                 C 140,325 120,315 125,295 
                 C 130,275 150,270 165,265 
                 C 175,260 185,250 180,235 
                 C 175,220 160,205 170,185 
                 C 180,165 195,155 205,140 
                 C 215,125 210,105 215,85 
                 Z"
              fill="url(#mapGradient)"
              stroke="#87A96B"
              strokeWidth="1.8"
              strokeLinejoin="round"
              className="transition-colors duration-300"
            />

            {/* Internal State Partition Curves (Subtle Industrial Zone Mapping) */}
            {/* Gujarat Boundary */}
            <path
              d="M 125,295 C 145,290 170,295 185,280 C 195,270 200,285 205,310 C 190,320 170,335 155,335 Z"
              fill="#87A96B"
              fillOpacity="0.25"
              stroke="#5A7D4C"
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />

            {/* Maharashtra Boundary */}
            <path
              d="M 170,345 C 195,335 240,335 270,350 C 265,385 245,415 220,425 C 190,420 180,390 170,345 Z"
              fill="#5A3E2B"
              fillOpacity="0.15"
              stroke="#5A3E2B"
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />

            {/* Tamil Nadu Boundary */}
            <path
              d="M 245,510 C 275,505 295,515 305,535 C 295,570 280,600 260,615 C 255,590 250,550 245,510 Z"
              fill="#D5851F"
              fillOpacity="0.2"
              stroke="#D5851F"
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />

            {/* Connecting Industrial Corridor Lines (Headquarters to Facilities) */}
            {/* NCR to Gujarat */}
            <path
              d="M 260,195 Q 210,235 175,295"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeDasharray="5,4"
              className="motion-safe:animate-pulse"
            />

            {/* NCR to Maharashtra */}
            <path
              d="M 260,195 Q 240,290 205,390"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeDasharray="5,4"
              className="motion-safe:animate-pulse"
            />

            {/* Maharashtra to Tamil Nadu */}
            <path
              d="M 205,390 Q 235,470 275,550"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeDasharray="5,4"
              className="motion-safe:animate-pulse"
            />

            {/* Gujarat to Tamil Nadu direct multi-location logistics link */}
            <path
              d="M 175,295 Q 200,430 275,550"
              stroke="#87A96B"
              strokeWidth="1.2"
              strokeDasharray="3,3"
              strokeOpacity="0.6"
            />

            {/* Hub Radar Pulses and Markers */}
            {hubs.map((hub) => {
              const isSelected = activeHub === hub.id;
              return (
                <g
                  key={hub.id}
                  className="cursor-pointer group"
                  onClick={() => setActiveHub(hub.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${hub.name}, ${hub.state}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveHub(hub.id);
                  }}
                >
                  {/* Outer pulse ring for active/selected */}
                  {isSelected && (
                    <circle
                      cx={hub.coords.x}
                      cy={hub.coords.y}
                      r="16"
                      fill={hub.color}
                      fillOpacity="0.2"
                      className="motion-safe:animate-ping origin-center"
                    />
                  )}

                  <circle
                    cx={hub.coords.x}
                    cy={hub.coords.y}
                    r={isSelected ? '9' : '6'}
                    fill={hub.color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all duration-200 group-hover:scale-125"
                  />

                  {/* Inner center dot */}
                  <circle cx={hub.coords.x} cy={hub.coords.y} r="2.5" fill="#FFFFFF" />

                  {/* Node Label on Map */}
                  <text
                    x={hub.coords.x + 10}
                    y={hub.coords.y + 4}
                    fill="#303A34"
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '500'}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    className="select-none pointer-events-none drop-shadow-sm"
                  >
                    {hub.city.split(' / ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Realistic UI Badge 1 (Top Left / Pilot State Approval) */}
          <div className="absolute top-2 left-2 max-w-[200px] sm:max-w-[220px] bg-white/95 border border-stone-200/90 rounded-lg p-2.5 shadow-md transform -rotate-1 hover:rotate-0 transition-transform hidden sm:block">
            <div className="flex items-center gap-1.5 text-[10px] text-brand-deep-sage font-bold font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>CTE • GUJARAT GPCB</span>
            </div>
            <p className="text-[11px] font-semibold text-brand-charcoal mt-1 line-clamp-1">
              Consent to Establish Granted
            </p>
            <div className="flex items-center justify-between text-[9px] text-stone-500 mt-1">
              <span>Air & Water Acts</span>
              <span className="font-mono text-emerald-700 font-bold">100% VALIDATED</span>
            </div>
          </div>

          {/* Floating Realistic UI Badge 2 (Bottom Right / Credit Guarantee) */}
          <div className="absolute bottom-3 right-2 max-w-[210px] sm:max-w-[230px] bg-white/95 border border-stone-200/90 rounded-lg p-2.5 shadow-md transform rotate-1 hover:rotate-0 transition-transform">
            <div className="flex items-center justify-between text-[10px] font-mono text-brand-walnut font-bold">
              <span className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-brand-amber" />
                CGTMSE CGS-I
              </span>
              <span className="text-emerald-700 font-semibold">85% COVER</span>
            </div>
            <p className="text-[11px] font-semibold text-brand-charcoal mt-0.5">
              ₹5.0 Cr Facility Guarantee
            </p>
            <div className="text-[9px] text-stone-500 mt-0.5 flex items-center justify-between">
              <span>Official 1 Apr 2025 Schedule</span>
              <span className="text-brand-deep-sage font-semibold">MSE Tier 1</span>
            </div>
          </div>

          {/* Floating Realistic UI Badge 3 (Top Right / Enterprise Siting) */}
          <div className="absolute top-4 right-2 max-w-[190px] bg-white/95 border border-stone-200/90 rounded-lg p-2 shadow-sm hidden md:block">
            <div className="flex items-center gap-1 text-[10px] text-stone-600 font-medium font-mono">
              <Building2 className="h-3 w-3 text-brand-deep-sage" />
              <span>Multi-Location Enterprise</span>
            </div>
            <div className="text-[11px] font-bold text-brand-deep-sage mt-0.5">
              Horizon AutoTech Pvt Ltd
            </div>
            <div className="text-[9px] text-stone-500 mt-0.5">
              3 States • Centralized Vault
            </div>
          </div>
        </div>

        {/* Interactive Hub Detail Strip Below Map */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-brand-deep-sage" />
              <span className="font-bold text-brand-charcoal">{activeHubData.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage font-semibold">
                {activeHubData.tier}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {activeHubData.city} ({activeHubData.state}) • <span className="text-brand-walnut font-medium">{activeHubData.tag}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {hubs.map((hub) => (
              <button
                key={hub.id}
                onClick={() => setActiveHub(hub.id)}
                className={`text-[10px] px-2 py-1 rounded transition-colors font-medium ${
                  activeHub === hub.id
                    ? 'bg-brand-deep-sage text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {hub.state.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
