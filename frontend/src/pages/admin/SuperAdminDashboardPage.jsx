import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldAlert,
  Users,
  Building2,
  FileCheck,
  Landmark,
  Layers,
  Sparkles,
  LifeBuoy,
  ShieldCheck,
  History,
  Eye,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  RefreshCw,
} from 'lucide-react';

export const SuperAdminDashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getPlatformOverview();
      if (res.data?.success && res.data?.data) {
        setOverview(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load platform overview metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage"></div>
          <span className="text-xs text-stone-500 font-medium">Aggregating platform database metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span>{error}</span>
        </div>
        <Button size="sm" variant="outline" onClick={fetchOverview}>
          Retry
        </Button>
      </div>
    );
  }

  const { users, enterprises, governance, applications, grievances, schemes, compliance, recent_activities } =
    overview || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">Platform Governance & Oversight</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN PORTAL
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time administrative telemetry across 36 States & UTs, Central ministries, and local bodies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Telemetry
          </Button>
          <Link to="/admin/officers">
            <Button variant="primary" size="sm">
              <UserCheck className="h-4 w-4 mr-1.5" /> Provision Officer
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Registered Users</div>
              <div className="text-xl font-bold text-brand-charcoal">{users?.total || 0}</div>
              <div className="text-[10px] text-stone-400">
                {users?.business_owners || 0} Owners • {users?.department_officers || 0} Officers
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Enterprises & Locations */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Enterprises & Facilities</div>
              <div className="text-xl font-bold text-brand-charcoal">{enterprises?.total_businesses || 0}</div>
              <div className="text-[10px] text-stone-400">
                {enterprises?.total_locations || 0} Business Locations Operating
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Application Pipeline */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Total Applications</div>
              <div className="text-xl font-bold text-brand-charcoal">{applications?.total || 0}</div>
              <div className="text-[10px] text-stone-400">
                {applications?.by_status?.UNDER_SCRUTINY || 0} In Scrutiny • {applications?.by_status?.RECOMMENDED || 0} Approved
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Active Schemes & Grievances */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Active Grievances</div>
              <div className="text-xl font-bold text-brand-charcoal">{grievances?.total || 0}</div>
              <div className="text-[10px] text-stone-400">
                {grievances?.by_status?.UNDER_EXAMINATION || 0} Under Review • {schemes?.active || 0} Active Schemes
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Application Status Pipeline */}
      <Card>
        <CardHeader className="border-b border-stone-200/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-brand-deep-sage" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
              National Application Scrutiny Pipeline
            </h2>
          </div>
          <Link to="/admin/applications" className="text-xs text-brand-deep-sage font-semibold hover:underline">
            View All Applications →
          </Link>
        </CardHeader>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
              <div className="text-xs font-medium text-stone-500">Draft</div>
              <div className="text-lg font-bold text-stone-700 mt-1">{applications?.by_status?.DRAFT || 0}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <div className="text-xs font-medium text-blue-700">Submitted</div>
              <div className="text-lg font-bold text-blue-800 mt-1">{applications?.by_status?.SUBMITTED || 0}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <div className="text-xs font-medium text-amber-700">Under Scrutiny</div>
              <div className="text-lg font-bold text-amber-800 mt-1">{applications?.by_status?.UNDER_SCRUTINY || 0}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
              <div className="text-xs font-medium text-purple-700">Clarification</div>
              <div className="text-lg font-bold text-purple-800 mt-1">
                {applications?.by_status?.CLARIFICATION_REQUESTED || 0}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
              <div className="text-xs font-medium text-emerald-700">Recommended</div>
              <div className="text-lg font-bold text-emerald-800 mt-1">{applications?.by_status?.RECOMMENDED || 0}</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-center">
              <div className="text-xs font-medium text-rose-700">Rejected</div>
              <div className="text-lg font-bold text-rose-800 mt-1">{applications?.by_status?.REJECTED || 0}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Two Column Layout: Quick Actions & Recent Platform Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Governance Links */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b border-stone-200/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
              Administrative Control Center
            </h2>
          </CardHeader>
          <CardBody className="p-4 space-y-2">
            <Link
              to="/admin/users"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-brand-charcoal">User Registry</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>

            <Link
              to="/admin/officers"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-brand-deep-sage" />
                <span className="font-semibold text-brand-charcoal">Department Officers</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>

            <Link
              to="/admin/departments"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Landmark className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-brand-charcoal">Statutory Departments</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>

            <Link
              to="/admin/jurisdictions"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-brand-charcoal">Territories & Jurisdictions</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>

            <Link
              to="/admin/catalogue"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-brand-charcoal">Master Approval Catalogue</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>

            <Link
              to="/admin/audit-logs"
              className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <History className="h-4 w-4 text-rose-700" />
                <span className="font-semibold text-brand-charcoal">Platform Audit Logs</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
            </Link>
          </CardBody>
        </Card>

        {/* Recent Audit Activities */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-stone-200/80 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-brand-deep-sage" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                Recent Audit Trail Activities
              </h2>
            </div>
            <Link to="/admin/audit-logs" className="text-xs text-brand-deep-sage font-semibold hover:underline">
              Full Security Log →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recent_activities?.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {recent_activities.map((a, idx) => (
                  <div key={a.id || idx} className="p-3 text-xs flex items-center justify-between hover:bg-stone-50/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="demo" size="xs">
                        {a.action}
                      </Badge>
                      <div>
                        <div className="font-semibold text-brand-charcoal">
                          {a.target_collection} • Target: <span className="font-mono text-stone-500">{a.target_id || 'System'}</span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Role: {a.actor_role} • IP: {a.ip_address}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      {a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-400">No audit log records available.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
