import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  FileCheck,
  AlertTriangle,
  Clock,
  Compass,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { currentBusiness, currentLocation } = useFacility();

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
        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Active Clearances
              </div>
              <div className="text-2xl font-bold text-brand-deep-sage font-mono mt-1">08</div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Across 2 Locations</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-pale-sage flex items-center justify-center text-brand-deep-sage">
              <FileCheck className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Renewals Due (60d)
              </div>
              <div className="text-2xl font-bold text-brand-walnut font-mono mt-1">02</div>
              <div className="text-[10px] text-brand-walnut font-medium mt-0.5">Fire NOC & Factory Lic.</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-brand-amber">
              <Clock className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Officer Clarifications
              </div>
              <div className="text-2xl font-bold text-brand-amber font-mono mt-1">01</div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Response needed (11d left)</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Document Vault
              </div>
              <div className="text-2xl font-bold text-brand-charcoal font-mono mt-1">14</div>
              <div className="text-[10px] text-stone-500 mt-0.5">Verified Documents & Blueprints</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <FolderArchive className="h-5 w-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Active Application Dossiers Preview */}
      <Card>
        <CardHeader
          title="Active Approval Applications"
          subtitle="Real-time statutory scrutiny status across state and central departments"
          action={
            <Button variant="outline" size="sm">
              View All Dossiers
            </Button>
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
              <tr className="hover:bg-brand-pale-sage/20 transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-brand-deep-sage">
                  BP-2026-GJ-GPCB-00492
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-brand-charcoal">Consent to Establish (CTE)</div>
                  <div className="text-[10px] text-stone-500">Water & Air Pollution Acts (Red Category)</div>
                </td>
                <td className="py-3 px-4 text-stone-600">Gujarat Pollution Control Board</td>
                <td className="py-3 px-4">
                  <Badge variant="default" size="xs">Gujarat (IN-GJ)</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="clarification" size="xs">Query Raised</Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <Button variant="accent" size="sm">
                    Respond to Query
                  </Button>
                </td>
              </tr>

              <tr className="hover:bg-brand-pale-sage/20 transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-brand-deep-sage">
                  BP-2026-GJ-DISH-00108
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-brand-charcoal">Factory License Sanction</div>
                  <div className="text-[10px] text-stone-500">The Factories Act, 1948</div>
                </td>
                <td className="py-3 px-4 text-stone-600">Directorate of Industrial Safety & Health</td>
                <td className="py-3 px-4">
                  <Badge variant="default" size="xs">Gujarat (IN-GJ)</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="under_scrutiny" size="xs">Under Scrutiny</Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <Button variant="outline" size="sm">
                    View Dossier
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
