import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { officerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ClipboardList,
  Coins,
  LifeBuoy,
  FileCheck,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  RefreshCw,
  UserCheck,
  Eye,
} from 'lucide-react';

export const OfficerDashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await officerAPI.getDashboardMetrics();
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load officer scrutiny metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-deep-sage"></div>
          <span className="text-xs text-stone-500 font-medium">Loading officer scrutiny desk metrics...</span>
        </div>
      </div>
    );
  }

  const { officer, metrics, recent_applications } = data || {};

  return (
    <div className="space-y-6">
      {/* Officer Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">
              Welcome, Officer {officer?.full_name || user?.full_name}
            </h1>
            <Badge variant="demo" size="sm">
              DEPARTMENT_OFFICER PORTAL
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>Department:</span>
            <span className="font-bold text-brand-deep-sage font-mono bg-brand-pale-sage px-1.5 py-0.5 rounded">
              {officer?.department_code || 'UNASSIGNED'}
            </span>
            <span>• Jurisdiction:</span>
            <span className="font-bold text-brand-walnut font-mono">
              {officer?.jurisdiction_code || 'National'}
            </span>
            {officer?.badge_number && (
              <>
                <span>• Badge ID:</span>
                <span className="font-mono text-stone-600 font-semibold">{officer.badge_number}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Link to="/officer/queue">
            <Button variant="primary" size="sm">
              <ClipboardList className="h-4 w-4 mr-1.5" /> Open Scrutiny Queue
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scrutiny Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Scrutiny */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Pending Scrutiny</div>
              <div className="text-xl font-bold text-brand-charcoal">{metrics?.pending_scrutiny || 0}</div>
              <div className="text-[10px] text-stone-400">Newly submitted dossiers</div>
            </div>
          </CardBody>
        </Card>

        {/* Under Active Examination */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Under Examination</div>
              <div className="text-xl font-bold text-brand-charcoal">{metrics?.under_scrutiny || 0}</div>
              <div className="text-[10px] text-stone-400">In-progress review notes</div>
            </div>
          </CardBody>
        </Card>

        {/* Clarifications Awaited */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Clarifications Awaited</div>
              <div className="text-xl font-bold text-brand-charcoal">{metrics?.clarifications_awaited || 0}</div>
              <div className="text-[10px] text-stone-400">Queries with applicant</div>
            </div>
          </CardBody>
        </Card>

        {/* Completed Scrutinies */}
        <Card className="hover:border-stone-300 transition-colors">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500">Completed Reviews</div>
              <div className="text-xl font-bold text-brand-charcoal">{metrics?.total_completed || 0}</div>
              <div className="text-[10px] text-stone-400">
                {metrics?.recommended || 0} Recommended • {metrics?.rejected || 0} Rejected
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/officer/queue">
          <Card className="hover:border-brand-deep-sage transition-all hover:shadow-md cursor-pointer h-full">
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-pale-sage flex items-center justify-center text-brand-deep-sage">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <Badge variant="demo" size="xs">
                    {metrics?.assigned_applications || 0} Dossiers
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-brand-charcoal">Application Scrutiny Desk</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Examine statutory clearance dossiers, review compliance attachments, and record recommendations.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-brand-deep-sage mt-4">
                Open Scrutiny Queue <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/officer/scheme-reviews">
          <Card className="hover:border-brand-deep-sage transition-all hover:shadow-md cursor-pointer h-full">
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                    <Coins className="h-5 w-5" />
                  </div>
                  <Badge variant="default" size="xs">
                    Department Schemes
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-brand-charcoal">Incentive Scheme Reviews</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Audit industrial subsidy applications, CGTMSE coverage proofs, and capital subsidy evidence.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-brand-deep-sage mt-4">
                Open Scheme Reviews <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/officer/grievances">
          <Card className="hover:border-brand-deep-sage transition-all hover:shadow-md cursor-pointer h-full">
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <Badge variant="danger" size="xs">
                    {metrics?.pending_grievances || 0} Pending
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-brand-charcoal">Grievance Examination Desk</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Review applicant dispute filings, address procedural delays, and submit formal resolution notes.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-brand-deep-sage mt-4">
                Open Grievance Desk <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Recent Scoped Applications Table */}
      <Card>
        <CardHeader className="border-b border-stone-200/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-brand-deep-sage" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
              Recently Assigned Scrutiny Dossiers
            </h2>
          </div>
          <Link to="/officer/queue" className="text-xs text-brand-deep-sage font-semibold hover:underline">
            View All in Scrutiny Desk →
          </Link>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {recent_applications?.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">App Number / Clearance</th>
                  <th className="p-3.5">Applicant Enterprise</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Last Updated</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent_applications.map((app) => (
                  <tr key={app.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-brand-charcoal font-mono">{app.application_number}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{app.approval_name}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-brand-charcoal flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-brand-deep-sage" />
                        <span>{app.business_name || 'Enterprise'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="demo" size="xs">
                        {app.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-stone-500 font-mono text-[11px]">
                      {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link to={`/officer/queue`}>
                        <Button size="xs" variant="outline">
                          <Eye className="h-3 w-3 mr-1" /> Scrutinize
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-stone-400">
              No recent applications in your department queue.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
