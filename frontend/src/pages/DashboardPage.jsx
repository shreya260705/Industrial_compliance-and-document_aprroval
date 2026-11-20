import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { applicationAPI, complianceAPI, documentAPI } from '../services/api';
import {
  Building2,
  FileCheck,
  AlertTriangle,
  Clock,
  Compass,
  FolderArchive,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { currentBusiness, currentLocation } = useFacility();
  const [dashboardData, setDashboardData] = useState({
    applicationMetrics: null,
    recentApplications: null,
    complianceMetrics: null,
    documentCount: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const businessId = currentBusiness?.id;
    const businessParams = businessId ? { business_id: businessId } : {};

    const loadDashboardData = async () => {
      setLoadingMetrics(true);
      setMetricsError('');
      setDashboardData({
        applicationMetrics: null,
        recentApplications: null,
        complianceMetrics: null,
        documentCount: null,
      });

      const results = await Promise.allSettled([
        applicationAPI.getMetrics(businessParams),
        applicationAPI.list({ ...businessParams, page: 1, page_size: 5 }),
        complianceAPI.getMetrics(businessParams),
        documentAPI.list({ ...businessParams, page: 1, page_size: 1 }),
      ]);

      if (!isCurrent) return;

      const errors = [];
      const readData = (result, label) => {
        if (result.status !== 'fulfilled') {
          errors.push(`${label} could not be loaded.`);
          return null;
        }
        if (!result.value.data?.success) {
          errors.push(`${label} could not be loaded.`);
          return null;
        }
        return result.value.data;
      };

      const metricsResponse = readData(results[0], 'Application metrics');
      const applicationsResponse = readData(results[1], 'Recent applications');
      const complianceResponse = readData(results[2], 'Renewal metrics');
      const documentsResponse = readData(results[3], 'Document Vault count');
      const documentCount = documentsResponse?.meta?.pagination?.total_records;

      if (documentsResponse && !Number.isFinite(documentCount)) {
        errors.push('Document Vault count could not be loaded.');
      }

      setDashboardData({
        applicationMetrics: metricsResponse?.data || null,
        recentApplications: Array.isArray(applicationsResponse?.data) ? applicationsResponse.data : null,
        complianceMetrics: complianceResponse?.data || null,
        documentCount: Number.isFinite(documentCount) ? documentCount : null,
      });
      setMetricsError(errors.join(' '));
      setLoadingMetrics(false);
    };

    loadDashboardData();
    return () => {
      isCurrent = false;
    };
  }, [currentBusiness?.id, refreshKey]);

  const { applicationMetrics, recentApplications, complianceMetrics, documentCount } = dashboardData;
  const activeApplications = applicationMetrics
    ? (applicationMetrics.submitted || 0)
      + (applicationMetrics.under_scrutiny || 0)
      + (applicationMetrics.clarification || 0)
      + (applicationMetrics.resubmitted || 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">
              Welcome, {user?.full_name || 'Industrial Operator'}
            </h1>
            <Badge variant="demo">Phase 3 Multi-Facility & Vault Active</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Active Enterprise:{' '}
            <span className="font-semibold text-brand-deep-sage">
              {currentBusiness?.legal_name || 'No business registered yet'}
            </span>{' '}
            • Location:{' '}
            <span className="font-semibold text-brand-walnut">
              {currentLocation?.location_name || 'All Facilities'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/facilities">
            <Button variant="secondary" size="sm" className="shadow-xs">
              <Building2 className="h-4 w-4 mr-1.5" /> Business Locations
            </Button>
          </Link>
          <Link to="/vault">
            <Button variant="outline" size="sm" className="shadow-xs">
              <FolderArchive className="h-4 w-4 mr-1.5" /> Document Vault
            </Button>
          </Link>
          <Link to="/kya">
            <Button variant="accent" size="sm" className="shadow-xs">
              <Compass className="h-4 w-4 mr-1.5" /> Launch KYA Engine
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/applications" className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep-sage">
          <Card className="h-full transition-colors hover:border-brand-deep-sage">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Active Applications
                </div>
                <div className="text-2xl font-bold text-brand-deep-sage font-mono mt-1">
                  {loadingMetrics ? '…' : activeApplications ?? '—'}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Submitted or under review</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-pale-sage flex items-center justify-center text-brand-deep-sage">
                <FileCheck className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/compliance/renewals" className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep-sage">
          <Card className="h-full transition-colors hover:border-brand-deep-sage">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Pending Renewals
                </div>
                <div className="text-2xl font-bold text-brand-walnut font-mono mt-1">
                  {loadingMetrics ? '…' : complianceMetrics?.pending_renewals ?? '—'}
                </div>
                <div className="text-[10px] text-brand-walnut font-medium mt-0.5">Tracked statutory renewals</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-brand-amber">
                <Clock className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/applications" className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep-sage">
          <Card className="h-full transition-colors hover:border-brand-deep-sage">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Officer Clarifications
                </div>
                <div className="text-2xl font-bold text-brand-amber font-mono mt-1">
                  {loadingMetrics ? '…' : applicationMetrics?.clarification ?? '—'}
                </div>
                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Applications awaiting your response</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/vault" className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep-sage">
          <Card className="h-full transition-colors hover:border-brand-deep-sage">
            <CardBody className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Document Vault
                </div>
                <div className="text-2xl font-bold text-brand-charcoal font-mono mt-1">
                  {loadingMetrics ? '…' : documentCount ?? '—'}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">Stored documents for this enterprise</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                <FolderArchive className="h-5 w-5" />
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {metricsError && (
        <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
          <span>Some dashboard metrics are unavailable. {metricsError}</span>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Recent Application Dossiers Preview */}
      <Card>
        <CardHeader
          title="Recent Approval Applications"
          subtitle="Recent application dossiers and their current status"
          action={
            <Link to="/applications">
              <Button variant="outline" size="sm">View All Dossiers</Button>
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-cream/50 border-b border-stone-200 text-stone-500 uppercase font-mono tracking-wider">
                <th className="py-3 px-4 font-semibold">Application Number</th>
                <th className="py-3 px-4 font-semibold">Clearance Title</th>
                <th className="py-3 px-4 font-semibold">Issuing Authority</th>
                <th className="py-3 px-4 font-semibold">Jurisdiction</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loadingMetrics ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-xs text-stone-500">Loading application dossiers…</td>
                </tr>
              ) : recentApplications?.length ? (
                recentApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-brand-pale-sage/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-brand-deep-sage">
                      {application.application_number || application.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-brand-charcoal">
                        {application.approval_title || application.approval_code || 'Approval application'}
                      </div>
                      <div className="text-[10px] text-stone-500">{application.statutory_act || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{application.department_code || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="default" size="xs">{application.state_code || '—'}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={(application.status || 'draft').toLowerCase()} size="xs">
                        {(application.status || 'DRAFT').replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to="/applications">
                        <Button variant="outline" size="sm">View Dossier</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-xs text-stone-500">
                    {recentApplications === null
                      ? 'Application list is unavailable. Use the Applications page to retry.'
                      : 'No application dossiers have been created for this enterprise yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
