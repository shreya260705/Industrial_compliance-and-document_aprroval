import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  MapPin,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';

export const AdminJurisdictionsPage = () => {
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'STATE',
    parent_code: '',
    is_active: true,
  });

  const fetchJurisdictions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listJurisdictions({
        type: typeFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) {
        setJurisdictions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load jurisdictions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJurisdictions();
  }, [typeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJurisdictions();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setForm({
      code: '',
      name: '',
      type: 'STATE',
      parent_code: '',
      is_active: true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (j) => {
    setIsEditing(true);
    setForm({
      code: j.code,
      name: j.name,
      type: j.type || 'STATE',
      parent_code: j.parent_code || '',
      is_active: j.is_active ?? true,
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
        await adminAPI.updateJurisdiction(form.code, form);
      } else {
        await adminAPI.createJurisdiction(form);
      }
      setIsModalOpen(false);
      fetchJurisdictions();
    } catch (err) {
      setModalError(err.response?.data?.error?.message || 'Failed to save jurisdiction record.');
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
            <h1 className="text-xl font-bold text-brand-charcoal">Territory & Jurisdiction Governance</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Maintain authoritative State, Union Territory, District, and Local Industrial Zone records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJurisdictions} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Jurisdiction
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
                placeholder="Search jurisdiction name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage bg-white"
              >
                <option value="">All Territory Types</option>
                <option value="STATE">States (28)</option>
                <option value="UT">Union Territories (8)</option>
                <option value="DISTRICT">Districts</option>
                <option value="LOCAL_BODY">Local Bodies / Industrial Zones</option>
              </select>

              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Jurisdictions Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading jurisdiction hierarchy...</div>
          ) : jurisdictions.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Territory Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Parent Territory</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {jurisdictions.map((j) => (
                  <tr key={j.code} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-brand-deep-sage">{j.code}</td>
                    <td className="p-3.5 font-semibold text-brand-charcoal">{j.name}</td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          j.type === 'STATE'
                            ? 'default'
                            : j.type === 'UT'
                            ? 'demo'
                            : 'secondary'
                        }
                        size="xs"
                      >
                        {j.type}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-stone-500">{j.parent_code || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          j.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {j.is_active !== false ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {j.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="xs" variant="outline" onClick={() => openEditModal(j)}>
                        Edit Record
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">No jurisdiction records found.</div>
          )}
        </CardBody>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal">
                  {isEditing ? `Edit Jurisdiction (${form.code})` : 'Add New Jurisdiction'}
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

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jurisdiction Code *</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="e.g. IN-KA-BLR"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage disabled:bg-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Territory Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru Urban District"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Type *</label>
                  <select
                    required
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage bg-white"
                  >
                    <option value="STATE">STATE</option>
                    <option value="UT">UT (Union Territory)</option>
                    <option value="DISTRICT">DISTRICT</option>
                    <option value="LOCAL_BODY">LOCAL_BODY / ZONE</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Parent Code</label>
                  <input
                    type="text"
                    placeholder="e.g. IN-KA"
                    value={form.parent_code}
                    onChange={(e) => setForm({ ...form, parent_code: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-brand-deep-sage font-mono"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 -mx-6 -mb-6 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={modalLoading}>
                  {isEditing ? 'Save Changes' : 'Create Jurisdiction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
