import React, { useState, useEffect } from 'react';
import { departmentAPI, jurisdictionAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Search,
  Building2,
  ExternalLink,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MapPin,
  Landmark,
} from 'lucide-react';

export const DepartmentDirectoryPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [stateCode, setStateCode] = useState('');

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

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          page_size: 15,
        };
        if (search) params.search = search;
        if (tier) params.tier = tier;
        if (stateCode) params.state_code = stateCode;

        const res = await departmentAPI.list(params);
        if (res.data?.success) {
          setDepartments(res.data.data);
          setTotalCount(res.data.meta?.pagination?.total_records || 0);
          setTotalPages(res.data.meta?.pagination?.total_pages || 1);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchDepartments();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [search, tier, stateCode, page]);

  const getTierBadge = (t) => {
    switch (t) {
      case 'CENTRAL':
        return <Badge variant="warning">Central Regulator</Badge>;
      case 'STATE':
        return <Badge variant="default">State Department</Badge>;
      case 'LOCAL':
        return <Badge variant="outline">Municipal / Local Body</Badge>;
      default:
        return <Badge variant="outline">{t}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-brand-charcoal">Statutory Department Directory</h1>
            <span className="text-xs bg-brand-pale-sage text-brand-deep-sage px-2 py-0.5 rounded font-mono font-bold">
              {totalCount} Authorities
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Authoritative registry of central, state, and local regulatory bodies governing industrial compliance across India.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by department name, code, or abbreviation..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="md:col-span-3">
            <select
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-md focus:outline-none focus:border-brand-deep-sage bg-white text-stone-700"
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Tiers (Central, State, Local)</option>
              <option value="CENTRAL">Central Regulatory Authorities</option>
              <option value="STATE">State Government Departments</option>
              <option value="LOCAL">Municipal / Development Authorities</option>
            </select>
          </div>

          <div className="md:col-span-3">
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
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-stone-200">
          <Landmark className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-brand-charcoal">No departments match your filters</h3>
          <p className="text-xs text-stone-500 mt-1">Try resetting the search or selecting another state.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.department_code}
              className="bg-white rounded-lg border border-stone-200 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {getTierBadge(dept.tier)}
                  <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">
                    {dept.department_code}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-brand-charcoal mb-1">
                  {dept.name}
                </h3>
                {dept.short_name && (
                  <div className="text-xs text-brand-deep-sage font-medium mb-3">
                    {dept.short_name}
                  </div>
                )}

                <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed">
                  {dept.regulatory_domain || 'Regulatory administration, statutory clearances, and inspections.'}
                </p>

                {dept.nodal_officer && (
                  <div className="p-2.5 bg-stone-50 rounded border border-stone-100 mb-3 space-y-1 text-[11px] text-stone-600">
                    <div className="font-semibold text-stone-800">
                      Nodal Office: {dept.nodal_officer.designation || 'Helpdesk'}
                    </div>
                    {dept.nodal_officer.contact_email && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Mail className="w-3 h-3" /> {dept.nodal_officer.contact_email}
                      </div>
                    )}
                    {dept.nodal_officer.contact_phone && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Phone className="w-3 h-3" /> {dept.nodal_officer.contact_phone}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-400 font-mono text-[11px]">
                  State: {dept.state_code || 'National'}
                </span>
                {dept.portal_url && (
                  <a
                    href={dept.portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-deep-sage hover:underline flex items-center gap-1 font-semibold text-xs"
                  >
                    Official Portal <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-stone-200 text-xs">
          <span className="text-stone-500">
            Page {page} of {totalPages} ({totalCount} departments)
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
    </div>
  );
};
