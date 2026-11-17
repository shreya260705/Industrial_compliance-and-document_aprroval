import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  UserCheck,
  Search,
  Plus,
  Shield,
  Briefcase,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  X,
  ClipboardList,
} from 'lucide-react';

export const AdminOfficersPage = () => {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Provision Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState('');
  const [provisionForm, setProvisionForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    department_code: '',
    jurisdiction_code: '',
    district_code: '',
    designation: '',
    badge_number: '',
  });

  // Transfer / Edit Assignment Modal State
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    department_code: '',
    jurisdiction_code: '',
    district_code: '',
    designation: '',
    badge_number: '',
  });

  const fetchOfficers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listOfficers({ search: search || undefined });
      if (res.data?.success) {
        setOfficers(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load officers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, jurRes] = await Promise.all([
        adminAPI.listDepartments({ page_size: 100 }),
        adminAPI.listJurisdictions({ type: 'STATE' }),
      ]);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (jurRes.data?.success) setJurisdictions(jurRes.data.data);
    } catch (err) {
      console.error('Failed to load metadata dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchOfficers();
    fetchMetadata();
  }, []);

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvisionLoading(true);
    setProvisionError('');
    try {
      await adminAPI.createOfficer(provisionForm);
      setIsProvisionOpen(false);
      setProvisionForm({
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        department_code: '',
        jurisdiction_code: '',
        district_code: '',
        designation: '',
        badge_number: '',
      });
      fetchOfficers();
    } catch (err) {
      setProvisionError(err.response?.data?.error?.message || 'Failed to provision officer account.');
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOfficer) return;
    setEditLoading(true);
    setEditError('');
    try {
      await adminAPI.updateOfficer(editingOfficer.id, editForm);
      setEditingOfficer(null);
      fetchOfficers();
    } catch (err) {
      setEditError(err.response?.data?.error?.message || 'Failed to update officer assignment.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (officer) => {
    const newStatus = !officer.is_active;
    const confirmMsg = newStatus
      ? `Reactivate scrutiny officer ${officer.full_name}?`
      : `Suspend scrutiny officer ${officer.full_name}? They will lose review access.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminAPI.updateUserStatus(officer.id, { is_active: newStatus });
      fetchOfficers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Status update failed.');
    }
  };

  const openEditModal = (off) => {
    setEditingOfficer(off);
    const prof = off.officer_profile || {};
    setEditForm({
      department_code: prof.department_code || '',
      jurisdiction_code: prof.jurisdiction_code || '',
      district_code: prof.district_code || '',
      designation: prof.designation || '',
      badge_number: prof.badge_number || '',
    });
    setEditError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">Department Officer Governance</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN EXCLUSIVE
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Provision, assign, transfer, and monitor scrutiny officers across all statutory departments and state jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOfficers} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsProvisionOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Provision New Officer
          </Button>
        </div>
      </div>

      {/* Officers List */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading department officers...</div>
          ) : officers.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Officer / Badge</th>
                  <th className="p-3.5">Assigned Department</th>
                  <th className="p-3.5">State & Jurisdiction</th>
                  <th className="p-3.5">Live Scrutiny Workload</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {officers.map((off) => {
                  const prof = off.officer_profile || {};
                  const wl = off.workload || {};
                  return (
                    <tr key={off.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-brand-charcoal">{off.full_name}</div>
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5">{off.email}</div>
                        <div className="text-[10px] text-brand-deep-sage font-mono font-bold mt-0.5">
                          {prof.designation || 'Officer'} • Badge: {prof.badge_number || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-brand-charcoal bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {prof.department_code || 'UNASSIGNED'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-brand-charcoal">
                          {prof.jurisdiction_code || 'National Scope'}
                        </div>
                        {prof.district_code && (
                          <div className="text-[10px] text-stone-500 font-mono">
                            District: {prof.district_code}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                            {wl.pending_reviews || 0} Pending
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                            {wl.completed_reviews || 0} Done
                          </span>
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            {wl.assigned_grievances || 0} Grievances
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            off.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {off.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {off.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button size="xs" variant="outline" onClick={() => openEditModal(off)}>
                          Transfer / Edit
                        </Button>
                        <Button
                          size="xs"
                          variant={off.is_active ? 'danger' : 'secondary'}
                          onClick={() => handleToggleStatus(off)}
                        >
                          {off.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">
              No Department Officers found. Click "Provision New Officer" to create one.
            </div>
          )}
        </CardBody>
      </Card>

      {/* Provision New Officer Modal */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal">Provision Department Scrutiny Officer</h3>
              </div>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {provisionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="officer.name@state.gov.in"
                    value={provisionForm.email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 chars, 1 num"
                    value={provisionForm.password}
                    onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Officer Full Name"
                    value={provisionForm.full_name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, full_name: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={provisionForm.phone_number}
                    onChange={(e) => setProvisionForm({ ...provisionForm, phone_number: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Department *</label>
                  <select
                    required
                    value={provisionForm.department_code}
                    onChange={(e) => setProvisionForm({ ...provisionForm, department_code: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.department_code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">State / Jurisdiction *</label>
                  <select
                    required
                    value={provisionForm.jurisdiction_code}
                    onChange={(e) => setProvisionForm({ ...provisionForm, jurisdiction_code: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    <option value="">Select State/UT</option>
                    {jurisdictions.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code} - {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scrutiny Officer"
                    value={provisionForm.designation}
                    onChange={(e) => setProvisionForm({ ...provisionForm, designation: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Badge Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ-ENV-4091"
                    value={provisionForm.badge_number}
                    onChange={(e) => setProvisionForm({ ...provisionForm, badge_number: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsProvisionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={provisionLoading}>
                  Provision Officer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Transfer Officer Modal */}
      {editingOfficer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal">
                  Transfer Officer / Update Assignment ({editingOfficer.full_name})
                </h3>
              </div>
              <button
                onClick={() => setEditingOfficer(null)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Department *</label>
                  <select
                    required
                    value={editForm.department_code}
                    onChange={(e) => setEditForm({ ...editForm, department_code: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.department_code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">State / Jurisdiction *</label>
                  <select
                    required
                    value={editForm.jurisdiction_code}
                    onChange={(e) => setEditForm({ ...editForm, jurisdiction_code: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    {jurisdictions.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code} - {j.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={editForm.badge_number}
                    onChange={(e) => setEditForm({ ...editForm, badge_number: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingOfficer(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={editLoading}>
                  Update Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
