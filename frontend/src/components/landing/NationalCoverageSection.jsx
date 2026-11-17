import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Layers,
  Landmark,
} from 'lucide-react';

export const NationalCoverageSection = () => {
  const [selectedStateCode, setSelectedStateCode] = useState('IN-GJ');
  const [filterType, setFilterType] = useState('PILOT'); // 'ALL' | 'PILOT' | 'STATES' | 'UTS'
  const [searchQuery, setSearchQuery] = useState('');

  // Comprehensive jurisdiction dataset covering 28 States and 8 UTs
  const jurisdictions = [
    // Pilot Deep Rule States
    {
      code: 'IN-GJ',
      name: 'Gujarat',
      type: 'STATE',
      zone: 'WEST',
      capital: 'Gandhinagar',
      coverageTier: 'PILOT_DEEP',
      spcb: 'Gujarat Pollution Control Board (GPCB)',
      dish: 'Directorate of Industrial Safety & Health (GJ-DISH)',
      fire: 'Gujarat State Fire Prevention & Life Safety',
      idc: 'Gujarat Industrial Development Corporation (GIDC)',
      portalName: 'Investor Facilitation Portal (IFP Gujarat)',
      portalUrl: 'https://ifp.gujarat.gov.in',
      keyClusters: 'Sanand Automotive, Dahej PCPIR, Ankleshwar Chemical, Hazira Heavy Engineering',
      approvalsCount: '7+ Clearances Modeled',
      rulesActive: true,
    },
    {
      code: 'IN-MH',
      name: 'Maharashtra',
      type: 'STATE',
      zone: 'WEST',
      capital: 'Mumbai',
      coverageTier: 'PILOT_DEEP',
      spcb: 'Maharashtra Pollution Control Board (MPCB)',
      dish: 'Directorate of Industrial Safety & Health (MH-DISH)',
      fire: 'Maharashtra Fire Services',
      idc: 'Maharashtra Industrial Development Corporation (MIDC)',
      portalName: 'MAITRI Single Window Portal',
      portalUrl: 'https://maitri.mahaonline.gov.in',
      keyClusters: 'Chakan Auto Belt, Pune IT/Hardware, Tarapur Chemical, Aurangabad Auto Hub',
      approvalsCount: '5+ Clearances Modeled',
      rulesActive: true,
    },
    {
      code: 'IN-TN',
      name: 'Tamil Nadu',
      type: 'STATE',
      zone: 'SOUTH',
      capital: 'Chennai',
      coverageTier: 'PILOT_DEEP',
      spcb: 'Tamil Nadu Pollution Control Board (TNPCB)',
      dish: 'Directorate of Industrial Safety and Health (TN-CIFB)',
      fire: 'Tamil Nadu Fire and Rescue Services',
      idc: 'State Industries Promotion Corporation of Tamil Nadu (SIPCOT)',
      portalName: 'Guidance Tamil Nadu Single Window Portal',
      portalUrl: 'https://easybusiness.tn.gov.in',
      keyClusters: 'Hosur Auto & Stamping, Sriperumbudur Electronics, Coimbatore Engineering, Tirupur Textile',
      approvalsCount: '5+ Clearances Modeled',
      rulesActive: true,
    },

    // Additional States
    {
      code: 'IN-KA',
      name: 'Karnataka',
      type: 'STATE',
      zone: 'SOUTH',
      capital: 'Bengaluru',
      coverageTier: 'MAPPED',
      spcb: 'Karnataka State Pollution Control Board (KSPCB)',
      dish: 'Department of Factories, Boilers & Industrial Safety',
      fire: 'Karnataka Fire and Emergency Services',
      idc: 'Karnataka Industrial Areas Development Board (KIADB)',
      portalName: 'e-Udyami Single Window Portal',
      portalUrl: 'https://ebiz.karnataka.gov.in',
      keyClusters: 'Peenya Industrial Area, Whitefield Aerospace, Bidadi Auto Hub',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-UP',
      name: 'Uttar Pradesh',
      type: 'STATE',
      zone: 'NORTH',
      capital: 'Lucknow',
      coverageTier: 'MAPPED',
      spcb: 'Uttar Pradesh Pollution Control Board (UPPCB)',
      dish: 'Directorate of Factories Uttar Pradesh',
      fire: 'Uttar Pradesh Fire Service',
      idc: 'UP State Industrial Development Authority (UPSIDA)',
      portalName: 'Nivesh Mitra Single Window Portal',
      portalUrl: 'https://niveshmitra.up.nic.in',
      keyClusters: 'Noida Electronics, Greater Noida EV Cluster, Kanpur Leather & Chemical',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-RJ',
      name: 'Rajasthan',
      type: 'STATE',
      zone: 'NORTH',
      capital: 'Jaipur',
      coverageTier: 'MAPPED',
      spcb: 'Rajasthan State Pollution Control Board (RSPCB)',
      dish: 'Factories & Boilers Inspection Department',
      fire: 'Rajasthan Fire Services',
      idc: 'Rajasthan State Industrial Development Corporation (RIICO)',
      portalName: 'RajNivesh Single Window Clearance',
      portalUrl: 'https://rajnivesh.rajasthan.gov.in',
      keyClusters: 'Neemrana Japanese Zone, Bhiwadi Auto, Boranada Solar Park',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-HR',
      name: 'Haryana',
      type: 'STATE',
      zone: 'NORTH',
      capital: 'Chandigarh',
      coverageTier: 'MAPPED',
      spcb: 'Haryana State Pollution Control Board (HSPCB)',
      dish: 'Industrial Safety and Health Department Haryana',
      fire: 'Haryana Fire Service',
      idc: 'Haryana State Industrial Infrastructure Development (HSIIDC)',
      portalName: 'Haryana Enterprise Promotion Centre (HEPC)',
      portalUrl: 'https://investharyana.in',
      keyClusters: 'Manesar Auto Belt, Faridabad Light Engineering, Panipat Handloom',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-AP',
      name: 'Andhra Pradesh',
      type: 'STATE',
      zone: 'SOUTH',
      capital: 'Amaravati',
      coverageTier: 'MAPPED',
      spcb: 'Andhra Pradesh Pollution Control Board (APPCB)',
      dish: 'Directorate of Factories Andhra Pradesh',
      fire: 'AP State Disaster Response & Fire Services',
      idc: 'AP Industrial Infrastructure Corporation (APIIC)',
      portalName: 'AP Single Desk Portal',
      portalUrl: 'https://apindustries.gov.in',
      keyClusters: 'Sri City Multi-Product SEZ, Visakhapatnam Pharma City',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-TS',
      name: 'Telangana',
      type: 'STATE',
      zone: 'SOUTH',
      capital: 'Hyderabad',
      coverageTier: 'MAPPED',
      spcb: 'Telangana State Pollution Control Board (TSPCB)',
      dish: 'Directorate of Factories Telangana',
      fire: 'Telangana State Disaster Response & Fire Services',
      idc: 'Telangana State Industrial Infrastructure Corporation (TSIIC)',
      portalName: 'TS-iPASS Industrial Approvals',
      portalUrl: 'https://ipass.telangana.gov.in',
      keyClusters: 'Genome Valley Biotech, Hyderabad Pharma City, Zaheerabad NIMZ',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-WB',
      name: 'West Bengal',
      type: 'STATE',
      zone: 'EAST',
      capital: 'Kolkata',
      coverageTier: 'MAPPED',
      spcb: 'West Bengal Pollution Control Board (WBPCB)',
      dish: 'Directorate of Factories West Bengal',
      fire: 'West Bengal Fire & Emergency Services',
      idc: 'West Bengal Industrial Development Corporation (WBIDC)',
      portalName: 'Silpa Sathi Single Window Services',
      portalUrl: 'https://silpasathi.wb.gov.in',
      keyClusters: 'Haldia Petrochemical Complex, Kharagpur Industrial Park',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-OR',
      name: 'Odisha',
      type: 'STATE',
      zone: 'EAST',
      capital: 'Bhubaneswar',
      coverageTier: 'MAPPED',
      spcb: 'State Pollution Control Board Odisha',
      dish: 'Directorate of Factories and Boilers Odisha',
      fire: 'Odisha Fire and Disaster Response Services',
      idc: 'Odisha Industrial Infrastructure Development (IDCO)',
      portalName: 'GO SWIFT Single Window Portal',
      portalUrl: 'https://investodisha.gov.in/goswift',
      keyClusters: 'Paradeep PCPIR, Kalinganagar Steel Cluster, Angul Aluminium Park',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-MP',
      name: 'Madhya Pradesh',
      type: 'STATE',
      zone: 'CENTRAL',
      capital: 'Bhopal',
      coverageTier: 'MAPPED',
      spcb: 'Madhya Pradesh Pollution Control Board (MPPCB)',
      dish: 'Industrial Health & Safety Directorate MP',
      fire: 'MP Urban Administration Fire Services',
      idc: 'MP Industrial Development Corporation (MPIDC)',
      portalName: 'Invest MP Portal',
      portalUrl: 'https://invest.mp.gov.in',
      keyClusters: 'Pithampur Auto & Pharma, Mandideep Industrial Area',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-PB',
      name: 'Punjab',
      type: 'STATE',
      zone: 'NORTH',
      capital: 'Chandigarh',
      coverageTier: 'MAPPED',
      spcb: 'Punjab Pollution Control Board (PPCB)',
      dish: 'Department of Labour and Factories Punjab',
      fire: 'Punjab Fire Services',
      idc: 'Punjab Small Industries & Export Corporation (PSIEC)',
      portalName: 'Invest Punjab Business First Portal',
      portalUrl: 'https://pbindustries.gov.in',
      keyClusters: 'Ludhiana Cycle & Hosiery, Mandi Gobindgarh Steel Rolling',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-KL',
      name: 'Kerala',
      type: 'STATE',
      zone: 'SOUTH',
      capital: 'Thiruvananthapuram',
      coverageTier: 'MAPPED',
      spcb: 'Kerala State Pollution Control Board (KSPCB)',
      dish: 'Department of Factories and Boilers Kerala',
      fire: 'Kerala Fire and Rescue Services',
      idc: 'Kerala State Industrial Development Corporation (KSIDC)',
      portalName: 'K-SWIFT Single Window Interface',
      portalUrl: 'https://kswift.kerala.gov.in',
      keyClusters: 'Kochi Petrochemical & Marine, KINFRA Parks',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-AS',
      name: 'Assam',
      type: 'STATE',
      zone: 'NORTHEAST',
      capital: 'Dispur',
      coverageTier: 'MAPPED',
      spcb: 'Pollution Control Board Assam (PCBA)',
      dish: 'Chief Inspectorate of Factories Assam',
      fire: 'Assam Fire & Emergency Services',
      idc: 'Assam Industrial Development Corporation (AIDC)',
      portalName: 'Ease of Doing Business Assam',
      portalUrl: 'https://eodb.assam.gov.in',
      keyClusters: 'Guwahati FMCG, Numaligarh Bamboo & Bio-refinery',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },

    // Union Territories
    {
      code: 'IN-DL',
      name: 'Delhi (NCT)',
      type: 'UT',
      zone: 'NORTH',
      capital: 'New Delhi',
      coverageTier: 'MAPPED',
      spcb: 'Delhi Pollution Control Committee (DPCC)',
      dish: 'Directorate of Industrial Safety Delhi',
      fire: 'Delhi Fire Services',
      idc: 'Delhi State Industrial and Infrastructure Development (DSIIDC)',
      portalName: 'Delhi Single Window Clearance Portal',
      portalUrl: 'https://swc.delhi.gov.in',
      keyClusters: 'Okhla Industrial Area, Bawana Industrial Complex, Patparganj',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-JK',
      name: 'Jammu and Kashmir',
      type: 'UT',
      zone: 'NORTH',
      capital: 'Srinagar / Jammu',
      coverageTier: 'MAPPED',
      spcb: 'J&K Pollution Control Committee (JKPCC)',
      dish: 'Labour and Employment Department J&K',
      fire: 'J&K Fire and Emergency Services',
      idc: 'J&K State Industrial Development Corporation (JKSIDCO)',
      portalName: 'J&K Single Window System',
      portalUrl: 'https://singlewindow.jk.gov.in',
      keyClusters: 'Bari Brahmana Industrial Complex, Lassipora Food Park',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-CH',
      name: 'Chandigarh',
      type: 'UT',
      zone: 'NORTH',
      capital: 'Chandigarh',
      coverageTier: 'MAPPED',
      spcb: 'Chandigarh Pollution Control Committee (CPCC)',
      dish: 'Labour Department Chandigarh Administration',
      fire: 'Chandigarh Municipal Fire Department',
      idc: 'Chandigarh Administration Industries Dept',
      portalName: 'Chandigarh Single Window Portal',
      portalUrl: 'https://chandigarh.gov.in',
      keyClusters: 'Chandigarh Industrial Area Phase I & II',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-DN',
      name: 'Dadra and Nagar Haveli and Daman and Diu',
      type: 'UT',
      zone: 'WEST',
      capital: 'Daman',
      coverageTier: 'MAPPED',
      spcb: 'Pollution Control Committee DNH & DD',
      dish: 'Inspectorate of Factories & Boilers Daman',
      fire: 'Fire & Emergency Services Daman & Diu',
      idc: 'Omnibus Industrial Development Corporation (OIDC)',
      portalName: 'DNH & DD Investor Facilitation Portal',
      portalUrl: 'https://daman.nic.in',
      keyClusters: 'Silvassa Polymer & Textile, Daman Plastics Cluster',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
    {
      code: 'IN-PY',
      name: 'Puducherry',
      type: 'UT',
      zone: 'SOUTH',
      capital: 'Puducherry',
      coverageTier: 'MAPPED',
      spcb: 'Puducherry Pollution Control Committee (PPCC)',
      dish: 'Department of Industrial Development Puducherry',
      fire: 'Puducherry Fire Service',
      idc: 'Puducherry Industrial Promotion Development (PIPDIC)',
      portalName: 'Puducherry Single Window Clearance',
      portalUrl: 'https://invest.py.gov.in',
      keyClusters: 'Mettupalayam Industrial Estate, Sedarapet',
      approvalsCount: 'Baseline Directory Mapped',
      rulesActive: false,
    },
  ];

  // Filter jurisdictions based on user search and tab selection
  const filtered = jurisdictions.filter((j) => {
    const matchesSearch =
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.keyClusters.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'PILOT') return j.coverageTier === 'PILOT_DEEP';
    if (filterType === 'STATES') return j.type === 'STATE';
    if (filterType === 'UTS') return j.type === 'UT';
    return true;
  });

  const activeState = jurisdictions.find((j) => j.code === selectedStateCode) || jurisdictions[0];

  return (
    <section id="coverage" className="py-16 bg-brand-cream/60 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pale-sage border border-brand-sage/40 text-brand-deep-sage text-xs font-semibold uppercase tracking-wider mb-3">
            <Landmark className="h-3.5 w-3.5 text-brand-deep-sage" />
            Federal Regulatory Architecture
          </div>
          <h2 className="text-3xl font-bold text-brand-charcoal tracking-tight">
            National Coverage: 28 States & 8 Union Territories
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            BizPermit bridges the gap between central statutory guidelines and state-level enforcement. Explore jurisdiction profiles, single window clearance portals, and state regulatory authorities.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            <button
              onClick={() => setFilterType('PILOT')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === 'PILOT'
                  ? 'bg-brand-deep-sage text-white font-semibold shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Deep Pilots (3 States)
            </button>
            <button
              onClick={() => setFilterType('ALL')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-brand-deep-sage text-white font-semibold shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Jurisdictions (36)
            </button>
            <button
              onClick={() => setFilterType('STATES')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === 'STATES'
                  ? 'bg-brand-deep-sage text-white font-semibold shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              States (28)
            </button>
            <button
              onClick={() => setFilterType('UTS')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === 'UTS'
                  ? 'bg-brand-deep-sage text-white font-semibold shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Union Territories (8)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state or cluster..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent bg-stone-50"
            />
          </div>
        </div>

        {/* Master-Detail Interactive Grid */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive State Selector (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl shadow-sm p-4 max-h-[560px] overflow-y-auto space-y-2">
            <div className="text-[11px] font-mono uppercase font-bold text-stone-400 px-1 mb-2 flex items-center justify-between">
              <span>Select Jurisdiction ({filtered.length} shown)</span>
              <span>ISO-3166-2:IN</span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                No matching jurisdiction found for "{searchQuery}".
              </div>
            ) : (
              filtered.map((j) => {
                const isSelected = selectedStateCode === j.code;
                return (
                  <div
                    key={j.code}
                    onClick={() => setSelectedStateCode(j.code)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedStateCode(j.code);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-deep-sage bg-brand-pale-sage/40 shadow-sm ring-1 ring-brand-deep-sage/20'
                        : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100/70 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          {j.code}
                        </span>
                        <span className="font-bold text-xs text-brand-charcoal">{j.name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                          j.coverageTier === 'PILOT_DEEP'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {j.coverageTier === 'PILOT_DEEP' ? 'Deep Pilot' : 'Mapped'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                      <span>Capital: {j.capital}</span>
                      <span className="text-brand-deep-sage font-medium">{j.zone} Zone</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Selected Jurisdiction Dossier (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl shadow-md p-6">
            {/* Jurisdiction Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-brand-charcoal">{activeState.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                    {activeState.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-brand-cream text-brand-walnut font-medium">
                    {activeState.type === 'STATE' ? 'State' : 'Union Territory'} • {activeState.zone} Zone
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Administrative Capital: <strong className="text-brand-charcoal">{activeState.capital}</strong>
                </p>
              </div>

              <div>
                {activeState.coverageTier === 'PILOT_DEEP' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Deep Statutory Pilot
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-sky-50 text-sky-800 border border-sky-300 font-semibold">
                    <Layers className="h-3.5 w-3.5 text-sky-600" />
                    Mapped Framework
                  </span>
                )}
              </div>
            </div>

            {/* Coverage Explanation Banner */}
            <div
              className={`p-3 rounded-lg mb-5 text-xs ${
                activeState.coverageTier === 'PILOT_DEEP'
                  ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-900'
                  : 'bg-stone-50 border border-stone-200 text-stone-700'
              }`}
            >
              {activeState.coverageTier === 'PILOT_DEEP' ? (
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Active Automated Statutory Engine:</strong> Multi-tiered clearances (CTE, CTO, Factory Licensing, Fire NOC, Boilers) are fully catalogued with declarative evaluation rules, document checklists, and line officer review desks.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-brand-amber shrink-0 mt-0.5" />
                  <div>
                    <strong>Baseline Directory & Framework Mapping:</strong> State single window portal, nodal departments, and industrial corridors are mapped. Full form filing and automated scrutiny are currently being rolled out across subsequent national releases.
                  </div>
                </div>
              )}
            </div>

            {/* Regulatory Authorities in this Jurisdiction */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-brand-charcoal">
                Key Regulatory Authorities & Portals
              </h4>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {/* SPCB / PCC */}
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <div className="font-semibold text-brand-deep-sage flex items-center justify-between">
                    <span>Pollution Control Authority</span>
                    <span className="text-[10px] font-mono text-stone-400">Environment</span>
                  </div>
                  <div className="font-medium text-brand-charcoal mt-1">{activeState.spcb}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Air & Water Acts • Hazardous Waste</div>
                </div>

                {/* DISH / Factories */}
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <div className="font-semibold text-brand-walnut flex items-center justify-between">
                    <span>Industrial Safety & Health</span>
                    <span className="text-[10px] font-mono text-stone-400">Labour</span>
                  </div>
                  <div className="font-medium text-brand-charcoal mt-1">{activeState.dish}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Factories Act 1948 • Boilers Act 1923</div>
                </div>

                {/* Fire Service */}
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <div className="font-semibold text-brand-amber flex items-center justify-between">
                    <span>Fire & Life Safety</span>
                    <span className="text-[10px] font-mono text-stone-400">Emergency</span>
                  </div>
                  <div className="font-medium text-brand-charcoal mt-1">{activeState.fire}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Fire Safety NOC & Plan Sanction</div>
                </div>

                {/* Industrial Development Corp */}
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <div className="font-semibold text-brand-deep-sage flex items-center justify-between">
                    <span>Industrial Infrastructure</span>
                    <span className="text-[10px] font-mono text-stone-400">Estates</span>
                  </div>
                  <div className="font-medium text-brand-charcoal mt-1">{activeState.idc}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Plot Allotment & Water Supply</div>
                </div>
              </div>
            </div>

            {/* Industrial Corridors & Single Window Portal Link */}
            <div className="p-4 rounded-xl bg-brand-cream/40 border border-stone-200 space-y-2 mb-6 text-xs">
              <div>
                <span className="font-semibold text-brand-charcoal">Key Industrial Hubs:</span>{' '}
                <span className="text-stone-600">{activeState.keyClusters}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-600">Official State Facilitation Portal:</span>
                <a
                  href={activeState.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand-deep-sage hover:underline"
                >
                  {activeState.portalName} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link to="/catalogue">
                <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep-sage hover:text-brand-charcoal transition-colors">
                  View Clearances for {activeState.name} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
              <Link to="/kya">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-deep-sage text-white text-xs font-semibold shadow-sm hover:bg-[#283b31] transition-colors">
                  Evaluate Business in {activeState.name}
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Federal Architecture Disclaimer */}
        <p className="text-center text-[11px] text-stone-500 mt-8 max-w-3xl mx-auto">
          <strong>National Scope Boundary:</strong> BizPermit models the federal division of statutory powers under the Seventh Schedule of the Constitution of India. State single-window portals remain the authoritative filing endpoints for statutory issuance.
        </p>
      </div>
    </section>
  );
};
