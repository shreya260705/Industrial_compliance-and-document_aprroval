import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  Compass,
  FolderArchive,
  CalendarDays,
  ShieldAlert,
  ClipboardList,
  Layers,
  Landmark,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Coins,
  Sparkles,
  LifeBuoy,
  MessageSquare,
  Users,
  UserCheck,
  Activity,
  History,
  Eye,
  Sliders,
  Award
} from 'lucide-react';

export const Sidebar = () => {
  const { isSuperAdmin, isDepartmentOfficer, isBusinessOwner } = useAuth();

  const getLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
      isActive
        ? 'bg-brand-deep-sage text-white shadow-sm'
        : 'text-stone-700 hover:bg-brand-pale-sage/60 hover:text-brand-deep-sage'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-stone-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* =========================================================================
            1. SUPER ADMIN EXCLUSIVE PORTAL
           ========================================================================= */}
        {isSuperAdmin && (
          <>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 px-3 mb-2 font-mono flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Platform Governance
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/dashboard" className={getLinkClasses}>
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-rose-700" />
                  <span className="font-semibold">Platform Overview</span>
                </NavLink>
                <NavLink to="/admin/users" className={getLinkClasses}>
                  <Users className="h-4 w-4 shrink-0 text-stone-600" />
                  <span>User Management</span>
                </NavLink>
                <NavLink to="/admin/officers" className={getLinkClasses}>
                  <UserCheck className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span className="font-semibold">Department Officers</span>
                </NavLink>
                <NavLink to="/admin/departments" className={getLinkClasses}>
                  <Landmark className="h-4 w-4 shrink-0 text-stone-600" />
                  <span>Statutory Departments</span>
                </NavLink>
                <NavLink to="/admin/jurisdictions" className={getLinkClasses}>
                  <MapPin className="h-4 w-4 shrink-0 text-stone-600" />
                  <span>Territories & Jurisdictions</span>
                </NavLink>
              </nav>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Catalogue & Oversight
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/catalogue" className={getLinkClasses}>
                  <Layers className="h-4 w-4 shrink-0 text-stone-600" />
                  <span>Approval Catalogue</span>
                </NavLink>
                <NavLink to="/admin/schemes" className={getLinkClasses}>
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Schemes Governance</span>
                </NavLink>
                <NavLink to="/admin/scheme-reviews/oversight" className={getLinkClasses}>
                  <Coins className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span>Review Oversight</span>
                </NavLink>
                <NavLink to="/admin/compliance" className={getLinkClasses}>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span>Compliance Oversight</span>
                </NavLink>
                <NavLink to="/admin/grievances" className={getLinkClasses}>
                  <LifeBuoy className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span>Grievance Oversight</span>
                </NavLink>
              </nav>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Operations & Security
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/applications" className={getLinkClasses}>
                  <Eye className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span>Application Monitoring</span>
                </NavLink>
                <NavLink to="/admin/audit-logs" className={getLinkClasses}>
                  <History className="h-4 w-4 shrink-0 text-stone-600" />
                  <span>Audit Logs & Security</span>
                </NavLink>
              </nav>
            </div>
          </>
        )}

        {/* =========================================================================
            2. DEPARTMENT OFFICER EXCLUSIVE PORTAL
           ========================================================================= */}
        {isDepartmentOfficer && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-deep-sage px-3 mb-2 font-mono flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> Department Scrutiny Desk
            </div>
            <nav className="space-y-1">
              <NavLink to="/officer/dashboard" className={getLinkClasses}>
                <LayoutDashboard className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                <span className="font-semibold">Officer Dashboard</span>
              </NavLink>
              <NavLink to="/officer/queue" className={getLinkClasses}>
                <ClipboardList className="h-4 w-4 shrink-0 text-brand-amber" />
                <span>Application Scrutiny Queue</span>
              </NavLink>
              <NavLink to="/officer/scheme-reviews" className={getLinkClasses}>
                <Coins className="h-4 w-4 shrink-0 text-brand-amber" />
                <span>Scheme Review Queue</span>
              </NavLink>
              <NavLink to="/officer/grievances" className={getLinkClasses}>
                <LifeBuoy className="h-4 w-4 shrink-0 text-brand-amber" />
                <span>Grievance Scrutiny</span>
              </NavLink>
              <NavLink to="/officer/profile" className={getLinkClasses}>
                <UserCheck className="h-4 w-4 shrink-0 text-stone-600" />
                <span>Officer Scope & Profile</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* =========================================================================
            3. BUSINESS OWNER EXCLUSIVE PORTAL
           ========================================================================= */}
        {isBusinessOwner && (
          <>
            {/* Workspace & Filings */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Business Workspace
              </div>
              <nav className="space-y-1">
                <NavLink to="/dashboard" className={getLinkClasses}>
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>My Dashboard</span>
                </NavLink>
                <NavLink to="/facilities" className={getLinkClasses}>
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Business Locations</span>
                </NavLink>
                <NavLink to="/applications" className={getLinkClasses}>
                  <FileCheck className="h-4 w-4 shrink-0" />
                  <span>Application Dossiers</span>
                </NavLink>
                <NavLink to="/vault" className={getLinkClasses}>
                  <FolderArchive className="h-4 w-4 shrink-0" />
                  <span>Document Vault</span>
                </NavLink>
              </nav>
            </div>

            {/* Discovery & Roadmap */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Statutory Discovery
              </div>
              <nav className="space-y-1">
                <NavLink to="/catalogue" className={getLinkClasses}>
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Discover Approvals</span>
                </NavLink>
                <NavLink to="/kya" className={getLinkClasses}>
                  <Compass className="h-4 w-4 shrink-0 text-brand-amber" />
                  <span className="font-semibold">KYA Roadmap Engine</span>
                </NavLink>
                <NavLink to="/departments" className={getLinkClasses}>
                  <Landmark className="h-4 w-4 shrink-0" />
                  <span>Department Directory</span>
                </NavLink>
                <NavLink to="/jurisdictions" className={getLinkClasses}>
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Territory & Jurisdictions</span>
                </NavLink>
              </nav>
            </div>

            {/* Compliance Engine */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Compliance Engine
              </div>
              <nav className="space-y-1">
                <NavLink to="/compliance" className={getLinkClasses}>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-deep-sage" />
                  <span className="font-semibold">Compliance Calendar</span>
                </NavLink>
                <NavLink to="/compliance/obligations" className={getLinkClasses}>
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  <span>Obligations Registry</span>
                </NavLink>
                <NavLink to="/compliance/renewals" className={getLinkClasses}>
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Renewals Pipeline</span>
                </NavLink>
              </nav>
            </div>

            {/* Schemes & Grievances */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-2 font-mono">
                Schemes & Redressal
              </div>
              <nav className="space-y-1">
                <NavLink to="/schemes" className={getLinkClasses}>
                  <Coins className="h-4 w-4 shrink-0 text-brand-amber" />
                  <span>Schemes Catalogue</span>
                </NavLink>
                <NavLink to="/schemes/recommendations" className={getLinkClasses}>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Facility Eligibility</span>
                </NavLink>
                <NavLink to="/scheme-applications" className={getLinkClasses}>
                  <FileCheck className="h-4 w-4 shrink-0" />
                  <span>Scheme Dossiers</span>
                </NavLink>
                <NavLink to="/grievances" className={getLinkClasses}>
                  <LifeBuoy className="h-4 w-4 shrink-0 text-brand-amber" />
                  <span>Grievances Desk</span>
                </NavLink>
                <NavLink to="/grievances/external-tracking" className={getLinkClasses}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span>External Tracking</span>
                </NavLink>
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Role Footer Scope Badge */}
      <div className="p-3 bg-brand-cream/60 rounded-lg border border-stone-200/80 text-[11px] text-stone-500">
        <div className="font-semibold text-brand-charcoal mb-0.5">
          {isSuperAdmin && "Super Admin Governance"}
          {isDepartmentOfficer && "Department Scrutiny Portal"}
          {isBusinessOwner && "Industrial Business Workspace"}
        </div>
        <div className="text-[10px]">
          {isSuperAdmin && "Full National Administrative Access"}
          {isDepartmentOfficer && "Department & Jurisdiction Scoped"}
          {isBusinessOwner && "Multi-Location Enterprise Scope"}
        </div>
      </div>
    </aside>
  );
};
