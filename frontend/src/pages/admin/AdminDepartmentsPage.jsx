import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Landmark,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  X,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';

export const AdminDepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [deptForm, setDeptForm] = useState({
    department_code: '',
    name: '',
    tier: 'STATE',
    state_code: '',
    nodal_officer_name: '',
    contact_email: '',
    contact_phone: '',
    portal_url: '',
    is_active: true,
  });

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listDepartments({
        tier: tierFilter || undefined,
        search: search || undefined,
        page_size: 100,
      });
      if (res.data?.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load statutory departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [tierFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDepartments();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setDeptForm({
      department_code: '',
      name: '',
      tier: 'STATE',
      state_code: '',
      nodal_officer_name: '',
      contact_email: '',
      contact_phone: '',
      portal_url: '',
      is_active: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (d) => {
    setIsEditing(true);
    setDeptForm({
      department_code: d.department_code,
      name: d.name,
      tier: d.tier || 'STATE',
      state_code: d.state_code || '',
      nodal_officer_name: d.nodal_officer_name || '',
      contact_email: d.contact_email || '',
      contact_phone: d.contact_phone || '',
      portal_url: d.portal_url || '',
      is_active: d.is_active ?? true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');
    try {
      if (isEditing) {
        await adminAPI.updateDepartment(deptForm.department_code, deptForm);
      } else {
        await adminAPI.createDepartment(deptForm);
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Failed to save department.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">Statutory Department Governance</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Maintain authoritative Central, State, and Local regulatory bodies and approval authorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDepartments} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1.5" /> Register Department
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search department name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="text-xs border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage bg-white"
              >
                <option value="">All Administrative Tiers</option>
                <option value="CENTRAL">Central Ministries</option>
                <option value="STATE">State Authorities</option>
                <option value="LOCAL">Local / Municipal Bodies</option>
              </select>

              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-stone-500">Loading statutory departments...</div>
        ) : departments.length > 0 ? (
          departments.map((d) => (
            <Card key={d.department_code} className="hover:border-stone-300 transition-colors flex flex-col justify-between">
              <CardBody className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-pale-sage text-brand-deep-sage border border-brand-sage/40">
                      {d.department_code}
                    </span>
                    <h3 className="text-sm font-bold text-brand-charcoal mt-1.5 line-clamp-1">{d.name}</h3>
                  </div>
                  <Badge variant={d.tier === 'CENTRAL' ? 'demo' : d.tier === 'STATE' ? 'default' : 'secondary'} size="xs">
                    {d.tier}
                  </Badge>
                </div>

                <div className="text-[11px] text-stone-500 space-y-1">
                  <div>
                    <span className="text-stone-400">Jurisdiction:</span>{' '}
                    <span className="font-semibold text-brand-charcoal">{d.state_code || 'National (All India)'}</span>
                  </div>
                  {d.nodal_officer_name && (
                    <div>
                      <span className="text-stone-400">Nodal Contact:</span>{' '}
                      <span className="font-medium text-stone-700">{d.nodal_officer_name}</span>
                    </div>
                  )}
                  {d.contact_email && (
                    <div className="flex items-center gap-1 font-mono text-[10px] text-stone-400">
                      <Mail className="h-3 w-3" /> {d.contact_email}
                    </div>
                  )}
                </div>
              </CardBody>

              <div className="p-3 bg-stone-50/80 border-t border-stone-200/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-stone-400">
                  Status: {d.is_active !== false ? 'Active' : 'Inactive'}
                </span>
                <Button size="xs" variant="outline" onClick={() => openEditModal(d)}>
                  Edit Department
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-xs text-stone-400">No departments match your filter.</div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal">
                  {isEditing ? `Edit Department (${deptForm.department_code})` : 'Register Statutory Department'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. KSPCB-ENV"
                    value={deptForm.department_code}
                    onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage disabled:bg-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tier *</label>
                  <select
                    required
                    value={deptForm.tier}
                    onChange={(e) => setDeptForm({ ...deptForm, tier: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    <option value="STATE">STATE</option>
                    <option value="CENTRAL">CENTRAL</option>
                    <option value="LOCAL">LOCAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Department Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka State Pollution Control Board"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">State Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. IN-KA (Leave empty for Central)"
                    value={deptForm.state_code}
                    onChange={(e) => setDeptForm({ ...deptForm, state_code: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nodal Officer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Secretary"
                    value={deptForm.nodal_officer_name}
                    onChange={(e) => setDeptForm({ ...deptForm, nodal_officer_name: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="nodal.contact@dept.gov.in"
                    value={deptForm.contact_email}
                    onChange={(e) => setDeptForm({ ...deptForm, contact_email: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Official Portal URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={deptForm.portal_url}
                    onChange={(e) => setDeptForm({ ...deptForm, portal_url: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={modalLoading}>
                  {isEditing ? 'Save Changes' : 'Register Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
