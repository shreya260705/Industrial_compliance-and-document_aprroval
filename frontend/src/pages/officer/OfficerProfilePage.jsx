import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import {
  Shield,
  Award,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Lock,
  CheckCircle,
  FileCheck,
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';

export const OfficerProfilePage = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeptInfo = async () => {
      try {
        const res = await adminAPI.getDepartments();
        if (res.data?.success) {
          setDepartments(res.data.data.departments || []);
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeptInfo();
  }, []);

  const officerDept = departments.find(d => d.code === user?.department_code);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-brand-deep-sage/10 text-brand-deep-sage flex items-center justify-center font-bold text-2xl border border-brand-deep-sage/20 shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-stone-900">{user?.full_name || 'Department Officer'}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="h-3 w-3" /> Active Official
                </span>
              </div>
              <p className="text-sm text-stone-600 mt-1 flex items-center gap-2">
                <span className="font-semibold text-stone-800">{user?.designation || 'Statutory Scrutiny Officer'}</span>
                <span>•</span>
                <span className="font-mono text-xs text-stone-500">Badge #{user?.badge_number || 'N/A'}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  {user?.email}
                </span>
                {user?.phone_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-stone-400" />
                    {user?.phone_number}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  Provisioned: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Service'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-brand-pale-sage/40 border border-brand-deep-sage/20 rounded-lg p-3 text-right shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">Assigned Authority</span>
            <span className="text-sm font-bold text-brand-deep-sage font-mono">{user?.department_code || 'CENTRAL'}</span>
            <span className="text-xs text-stone-600 block mt-0.5">{officerDept?.name || 'Department of Industrial Regulatory Oversight'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Jurisdictional Mandate & Workflow Powers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statutory Mandate Card */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-deep-sage" />
              Statutory Jurisdiction & Department Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200/80">
                <span className="text-xs font-semibold text-stone-500 block">Department Name</span>
                <span className="text-sm font-bold text-stone-900 mt-1 block">
                  {officerDept?.name || user?.department_code}
                </span>
                <span className="text-xs text-stone-500 mt-1 block">
                  Tier: <span className="font-semibold uppercase">{officerDept?.tier || 'State'}</span>
                </span>
              </div>

              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200/80">
                <span className="text-xs font-semibold text-stone-500 block">Territorial Jurisdiction Code</span>
                <span className="text-sm font-bold text-stone-900 font-mono mt-1 block">
                  {user?.jurisdiction_code || 'IN-ALL (National)'}
                </span>
                <span className="text-xs text-stone-500 mt-1 block">
                  District: <span className="font-semibold">{user?.district_code || 'All Jurisdictional Districts'}</span>
                </span>
              </div>
            </div>

            {/* Scope Notice */}
            <div className="mt-4 p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Shield className="h-3.5 w-3.5" /> Institutional Scope & Legal Disclaimer
              </div>
              <p className="leading-relaxed">
                Official actions taken through this credential are authenticated under the National Industrial Compliance framework.
                Review assessments, clarification requests, and statutory determinations are legally binding and logged immutably
                in the central compliance audit register.
              </p>
            </div>
          </div>

          {/* Delegated Authorities & Actions */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-deep-sage" />
              Delegated Statutory Authorities & Workflow Capabilities
            </h2>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
                  Permitted Approval Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {user?.permitted_approval_categories && user.permitted_approval_categories.length > 0 ? (
                    user.permitted_approval_categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-brand-pale-sage text-brand-deep-sage border border-brand-deep-sage/30"
                      >
                        {cat}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-500 italic">All departmental categories authorized</span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
                  Authorized Workflow Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  {(user?.permitted_workflow_actions || [
                    'APPLICATION_REVIEW',
                    'REQUEST_CLARIFICATION',
                    'APPROVE_APPLICATION',
                    'REJECT_APPLICATION',
                    'GRIEVANCE_RESOLVE',
                    'SCHEME_VERIFY'
                  ]).map((action, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-stone-100 text-stone-800 border border-stone-200"
                    >
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security, Credentials & Help */}
        <div className="space-y-6">
          {/* Security & Access Info */}
          <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Authentication & Credentials
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Security Clearance</span>
                <span className="font-bold text-stone-800">Tier 2 Statutory Officer</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Multi-Factor Status</span>
                <span className="font-semibold text-emerald-700">Enforced by Domain</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Assigned Department</span>
                <span className="font-mono text-stone-800 font-bold">{user?.department_code || 'GPCB'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">State / Region</span>
                <span className="font-mono text-stone-800">{user?.jurisdiction_code || 'IN-GJ'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">Role Authority</span>
                <span className="font-mono font-semibold text-brand-deep-sage">DEPARTMENT_OFFICER</span>
              </div>
            </div>
          </div>

          {/* Quick Support / Escalation Notice */}
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-5 text-xs text-stone-600 space-y-2">
            <div className="font-bold text-stone-800 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-stone-500" />
              Administrative Support
            </div>
            <p>
              To update your jurisdictional assignment, transfer departments, or request elevated workflow capabilities, contact the National Platform Super Administrator.
            </p>
            <div className="pt-2">
              <a
                href="mailto:admin@bizpermit.gov.in"
                className="text-brand-deep-sage font-medium hover:underline inline-flex items-center gap-1"
              >
                admin@bizpermit.gov.in <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OfficerProfilePage;
