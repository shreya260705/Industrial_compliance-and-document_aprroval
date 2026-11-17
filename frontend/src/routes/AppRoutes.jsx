import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Helper for safe named export dynamic loading
const lazyNamed = (loader, name) =>
  React.lazy(() =>
    loader().then((mod) => ({
      default: name ? mod[name] || mod.default : mod.default || mod[Object.keys(mod)[0]],
    }))
  );

// Route-level lazy loading
const LandingPage = lazyNamed(() => import('../pages/LandingPage'), 'LandingPage');
const LoginPage = lazyNamed(() => import('../pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('../pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyNamed(() => import('../pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('../pages/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = lazyNamed(() => import('../pages/DashboardPage'), 'DashboardPage');

// Phase 2 Discovery
const ApprovalCataloguePage = lazyNamed(() => import('../pages/ApprovalCataloguePage'), 'ApprovalCataloguePage');
const DepartmentDirectoryPage = lazyNamed(() => import('../pages/DepartmentDirectoryPage'), 'DepartmentDirectoryPage');
const JurisdictionExplorerPage = lazyNamed(() => import('../pages/JurisdictionExplorerPage'), 'JurisdictionExplorerPage');
const KYAEvaluatorPage = lazyNamed(() => import('../pages/KYAEvaluatorPage'), 'KYAEvaluatorPage');

// Phase 3 & 4 Business Owner
const FacilitiesPage = lazyNamed(() => import('../pages/FacilitiesPage'), 'FacilitiesPage');
const DocumentVaultPage = lazyNamed(() => import('../pages/DocumentVaultPage'), 'DocumentVaultPage');
const ApplicationsPage = lazyNamed(() => import('../pages/ApplicationsPage'), 'ApplicationsPage');

// Phase 5 Compliance
const ComplianceDashboardPage = lazyNamed(() => import('../pages/ComplianceDashboardPage'), 'ComplianceDashboardPage');
const ComplianceCalendarPage = lazyNamed(() => import('../pages/ComplianceCalendarPage'), 'ComplianceCalendarPage');
const ComplianceObligationsPage = lazyNamed(() => import('../pages/ComplianceObligationsPage'), 'ComplianceObligationsPage');
const ComplianceRenewalsPage = lazyNamed(() => import('../pages/ComplianceRenewalsPage'), 'ComplianceRenewalsPage');
const AdminCompliancePage = lazyNamed(() => import('../pages/AdminCompliancePage'), 'AdminCompliancePage');

// Phase 6 Module 1: Schemes
const SchemesCataloguePage = lazyNamed(() => import('../pages/SchemesCataloguePage'), 'SchemesCataloguePage');
const SchemeDetailPage = lazyNamed(() => import('../pages/SchemeDetailPage'), 'SchemeDetailPage');
const SchemeRecommendationsPage = lazyNamed(() => import('../pages/SchemeRecommendationsPage'), 'SchemeRecommendationsPage');
const SchemeApplicationsPage = lazyNamed(() => import('../pages/SchemeApplicationsPage'), 'SchemeApplicationsPage');
const SchemeApplicationDetailPage = lazyNamed(() => import('../pages/SchemeApplicationDetailPage'), 'SchemeApplicationDetailPage');
const AdminSchemesPage = lazyNamed(() => import('../pages/admin/AdminSchemesPage'), 'AdminSchemesPage');
const AdminSchemeCreatePage = lazyNamed(() => import('../pages/admin/AdminSchemeCreatePage'), 'AdminSchemeCreatePage');
const AdminSchemeEditPage = lazyNamed(() => import('../pages/admin/AdminSchemeEditPage'), 'AdminSchemeEditPage');
const AdminSchemeVerificationPage = lazyNamed(() => import('../pages/admin/AdminSchemeVerificationPage'), 'AdminSchemeVerificationPage');

// Phase 6 Module 2: Scheme Reviews
const OfficerSchemeReviewQueuePage = lazyNamed(() => import('../pages/officer/OfficerSchemeReviewQueuePage'), 'OfficerSchemeReviewQueuePage');
const OfficerSchemeReviewDetailPage = lazyNamed(() => import('../pages/officer/OfficerSchemeReviewDetailPage'), 'OfficerSchemeReviewDetailPage');
const AdminSchemeReviewOversightPage = lazyNamed(() => import('../pages/admin/AdminSchemeReviewOversightPage'), 'AdminSchemeReviewOversightPage');

// Phase 6 Module 3: Grievances
const GrievancesPage = lazyNamed(() => import('../pages/GrievancesPage'), 'GrievancesPage');
const GrievanceSubmissionPage = lazyNamed(() => import('../pages/GrievanceSubmissionPage'), 'GrievanceSubmissionPage');
const GrievanceDetailPage = lazyNamed(() => import('../pages/GrievanceDetailPage'), 'GrievanceDetailPage');
const ExternalGrievancesPage = lazyNamed(() => import('../pages/ExternalGrievancesPage'), 'ExternalGrievancesPage');
const OfficerGrievanceQueuePage = lazyNamed(() => import('../pages/officer/OfficerGrievanceQueuePage'), 'OfficerGrievanceQueuePage');
const OfficerGrievanceDetailPage = lazyNamed(() => import('../pages/officer/OfficerGrievanceDetailPage'), 'OfficerGrievanceDetailPage');
const AdminGrievanceOversightPage = lazyNamed(() => import('../pages/admin/AdminGrievanceOversightPage'), 'AdminGrievanceOversightPage');
const AdminGrievanceCategoriesPage = lazyNamed(() => import('../pages/admin/AdminGrievanceCategoriesPage'), 'AdminGrievanceCategoriesPage');
const AdminGrievanceEscalationRulesPage = lazyNamed(() => import('../pages/admin/AdminGrievanceEscalationRulesPage'), 'AdminGrievanceEscalationRulesPage');
const AdminGrievanceAuditPage = lazyNamed(() => import('../pages/admin/AdminGrievanceAuditPage'), 'AdminGrievanceAuditPage');

// Phase 6 Module 2 Officer Legacy & Scrutiny
const OfficerQueuePage = lazyNamed(() => import('../pages/OfficerQueuePage'), 'OfficerQueuePage');

// Dedicated RBAC Super Admin Portal Pages
const SuperAdminDashboardPage = lazyNamed(() => import('../pages/admin/SuperAdminDashboardPage'), 'SuperAdminDashboardPage');
const AdminUsersPage = lazyNamed(() => import('../pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminOfficersPage = lazyNamed(() => import('../pages/admin/AdminOfficersPage'), 'AdminOfficersPage');
const AdminDepartmentsPage = lazyNamed(() => import('../pages/admin/AdminDepartmentsPage'), 'AdminDepartmentsPage');
const AdminJurisdictionsPage = lazyNamed(() => import('../pages/admin/AdminJurisdictionsPage'), 'AdminJurisdictionsPage');
const AdminApplicationsMonitoringPage = lazyNamed(() => import('../pages/admin/AdminApplicationsMonitoringPage'), 'AdminApplicationsMonitoringPage');
const AdminAuditLogsPage = lazyNamed(() => import('../pages/admin/AdminAuditLogsPage'), 'AdminAuditLogsPage');

// Dedicated RBAC Department Officer Portal Pages
const OfficerDashboardPage = lazyNamed(() => import('../pages/officer/OfficerDashboardPage'), 'OfficerDashboardPage');
const OfficerProfilePage = lazyNamed(() => import('../pages/officer/OfficerProfilePage'), 'OfficerProfilePage');

const PageLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span className="text-xs text-gray-500 font-medium">Loading workspace module...</span>
    </div>
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Workspace Layout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* =========================================================================
              1. BUSINESS OWNER PORTAL (Role-Restricted)
             ========================================================================= */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <FacilitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <DocumentVaultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Statutory Discovery (Accessible to Business Owners) */}
          <Route path="/catalogue" element={<ApprovalCataloguePage />} />
          <Route path="/departments" element={<DepartmentDirectoryPage />} />
          <Route path="/jurisdictions" element={<JurisdictionExplorerPage />} />
          <Route path="/kya" element={<KYAEvaluatorPage />} />
          <Route path="/kya-wizard" element={<KYAEvaluatorPage />} />

          {/* Compliance Engine (Business Owner) */}
          <Route
            path="/compliance"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ComplianceDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/calendar"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ComplianceCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="/calendar" element={<Navigate to="/compliance/calendar" replace />} />
          <Route
            path="/compliance/obligations"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ComplianceObligationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/obligations/:id"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ComplianceObligationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/renewals"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ComplianceRenewalsPage />
              </ProtectedRoute>
            }
          />

          {/* Schemes & Incentives (Business Owner) */}
          <Route
            path="/schemes"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <SchemesCataloguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schemes/recommendations"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <SchemeRecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schemes/:code"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <SchemeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheme-applications"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <SchemeApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheme-applications/:id"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <SchemeApplicationDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Grievances Desk (Business Owner) */}
          <Route
            path="/grievances"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <GrievancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grievances/new"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <GrievanceSubmissionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grievances/external-tracking"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <ExternalGrievancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grievances/:id"
            element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <GrievanceDetailPage />
              </ProtectedRoute>
            }
          />

          {/* =========================================================================
              2. DEPARTMENT OFFICER PORTAL (Role-Restricted)
             ========================================================================= */}
          <Route
            path="/officer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/queue"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/scheme-reviews"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerSchemeReviewQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/scheme-reviews/:id"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerSchemeReviewDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/grievances"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerGrievanceQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/grievances/:id"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerGrievanceDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/profile"
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerProfilePage />
              </ProtectedRoute>
            }
          />

          {/* =========================================================================
              3. SUPER ADMIN PORTAL (Role-Restricted)
             ========================================================================= */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/officers"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminOfficersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminDepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jurisdictions"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminJurisdictionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminApplicationsMonitoringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Catalogue & Oversight */}
          <Route
            path="/admin/catalogue"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <ApprovalCataloguePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/compliance"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminCompliancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schemes"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchemesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schemes/new"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchemeCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schemes/:code/edit"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchemeEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schemes/:code/verification"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchemeVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scheme-reviews/oversight"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchemeReviewOversightPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grievances"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminGrievanceOversightPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grievances/categories"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminGrievanceCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grievances/escalation-rules"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminGrievanceEscalationRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grievances/audit"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminGrievanceAuditPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
