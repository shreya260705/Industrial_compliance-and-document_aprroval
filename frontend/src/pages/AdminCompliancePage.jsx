import React, { useState, useEffect } from 'react';
import { complianceAPI } from '../services/api';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  Landmark,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Search,
} from 'lucide-react';

export const AdminCompliancePage = () => {
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTemplate, setSearchTemplate] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [overviewRes, templatesRes] = await Promise.all([
        complianceAPI.getAdminOverview(),
        complianceAPI.getAdminTemplates(),
      ]);
      setOverview(overviewRes.data?.data || null);
      setTemplates(templatesRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const q = searchTemplate.toLowerCase();
    return (
      (t.template_code || '').toLowerCase().includes(q) ||
      (t.title || '').toLowerCase().includes(q) ||
      (t.department_code || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-brand-charcoal">
                  National Statutory Compliance Governance
                </h1>
                <Badge variant="demo">Super Admin Desk</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Central oversight of recurring compliance templates, nationwide health indices, and jurisdictional compliance distribution.
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadAdminData}>
          Refresh Oversight Data
        </Button>
      </div>

      {/* Nationwide Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-stone-200 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-stone-400">Total Obligations Tracked</div>
          <div className="text-2xl font-bold text-brand-charcoal mt-1">
            {overview?.total_obligations ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-500">Nationwide active load</div>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Completed Cycles
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            {overview?.completed_cycles ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-emerald-700">Verified evidence cycles</div>
        </div>

        <div className="p-4 bg-rose-50/60 rounded-lg border border-rose-300 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-rose-700 font-bold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Overdue Rate
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-1">
            {overview?.overdue_rate_percentage ?? (loading ? '...' : 0)}%
          </div>
          <div className="text-[11px] text-rose-700">National delinquency metric</div>
        </div>

        <div className="p-4 bg-brand-pale-sage/50 rounded-lg border border-brand-sage/40 shadow-xs">
          <div className="text-[10px] font-mono uppercase text-brand-deep-sage font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Verified Templates
          </div>
          <div className="text-2xl font-bold text-brand-deep-sage mt-1">
            {templates.length}
          </div>
          <div className="text-[11px] text-brand-deep-sage">Statutory seeded master templates</div>
        </div>
      </div>

      {/* State & Jurisdiction Breakdown Matrix */}
      {overview?.states_breakdown && overview.states_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand-deep-sage" />
              State & Territorial Compliance Distribution
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3">State Code</th>
                    <th className="p-3 text-center">Total Obligations</th>
                    <th className="p-3 text-center">Completed</th>
                    <th className="p-3 text-center">Overdue</th>
                    <th className="p-3 text-center">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {overview.states_breakdown.map((st) => (
                    <tr key={st.state_code} className="hover:bg-stone-50">
                      <td className="p-3 font-semibold text-brand-charcoal font-mono">
                        {st.state_code}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold">{st.total}</td>
                      <td className="p-3 text-center font-mono text-emerald-700">{st.completed}</td>
                      <td className="p-3 text-center font-mono text-rose-700 font-bold">{st.overdue}</td>
                      <td className="p-3 text-center font-mono font-bold text-brand-deep-sage">
                        {st.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Master Statutory Compliance Templates Registry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-walnut" />
            Statutory Master Templates Registry ({filteredTemplates.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search master templates..."
              value={searchTemplate}
              onChange={(e) => setSearchTemplate(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-300 rounded-md focus:outline-none"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-xs">Loading statutory master templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs bg-stone-50">
              No statutory templates found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3">Template Code</th>
                    <th className="p-3">Title & Regulatory Purpose</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Legal Basis Act</th>
                    <th className="p-3">Statutory Official Portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTemplates.map((tmpl) => (
                    <tr key={tmpl.template_code} className="hover:bg-stone-50/80">
                      <td className="p-3 font-mono font-bold text-brand-deep-sage whitespace-nowrap">
                        {tmpl.template_code}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-brand-charcoal">{tmpl.title}</div>
                        <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                          {tmpl.description}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-stone-600 whitespace-nowrap">
                        {tmpl.department_code}
                      </td>
                      <td className="p-3 font-mono text-stone-700 whitespace-nowrap">
                        {tmpl.frequency}
                      </td>
                      <td className="p-3 text-stone-600">
                        {tmpl.legal_act_reference || 'Statutory Indian Industrial Rules'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {tmpl.official_source_url ? (
                          <a
                            href={tmpl.official_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-deep-sage hover:underline"
                          >
                            <span>Official Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-stone-400 text-[10px]">Portal Link Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
