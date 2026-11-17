import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Building2,
  Clock,
  Layers,
  Search
} from 'lucide-react';
import { adminGrievancesAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminGrievanceCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackFilter, setTrackFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    track: 'TRACK_A_INTERNAL',
    code: '',
    name: '',
    description: '',
    department_code: '',
    state: '',
    default_sla_hours: 72,
    is_active: true
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGrievancesAPI.listCategories({
        track: trackFilter || undefined
      });
      if (res.data?.success) {
        setCategories(res.data.data?.categories || res.data.data?.results || []);
      }
    } catch (err) {
      console.error('Failed to load grievance categories:', err);
      setError(err.response?.data?.error?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [trackFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('Please provide category code and name.');
      return;
    }
    try {
      setSubmitting(true);
      await adminGrievancesAPI.createCategory({
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        default_sla_hours: Number(formData.default_sla_hours) || 72
      });
      setShowModal(false);
      setFormData({
        track: 'TRACK_A_INTERNAL',
        code: '',
        name: '',
        description: '',
        department_code: '',
        state: '',
        default_sla_hours: 72,
        is_active: true
      });
      fetchCategories();
      alert('Grievance category successfully created.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/grievances" className="hover:text-primary-600 flex items-center">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Grievance Oversight
            </Link>
            <span>/</span>
            <span>Classifications</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Grievance Classifications & Taxonomy</h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure dispute categories, statutory mappings, and baseline SLA resolution windows.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Classification
          </Button>

          <Button variant="ghost" size="sm" onClick={fetchCategories} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border">
        <span className="text-xs font-semibold text-gray-600">Filter Track:</span>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="text-xs border rounded p-1.5 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Tracks</option>
          <option value="TRACK_A_INTERNAL">Track A — Internal BizPermit Complaints</option>
          <option value="TRACK_B_STATUTORY_TRACKING">Track B — External Statutory Monitoring</option>
        </select>
      </div>

      {/* Categories Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Classification Name</th>
                <th className="py-3 px-4">Department / State</th>
                <th className="py-3 px-4">Target SLA</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <tr key={cat.code || cat._id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4">
                      <Badge variant={cat.track === 'TRACK_A_INTERNAL' ? 'primary' : 'warning'}>
                        {cat.track === 'TRACK_A_INTERNAL' ? 'Track A (Internal)' : 'Track B (Statutory)'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">{cat.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{cat.name}</div>
                      <div className="text-[11px] text-gray-500 max-w-sm truncate">{cat.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{cat.department_code || 'All Departments'}</div>
                      <div className="text-[10px] text-gray-400">{cat.state || 'All States'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {cat.default_sla_hours} hrs ({Math.round(cat.default_sla_hours / 24)} days)
                    </td>
                    <td className="py-3 px-4">
                      {cat.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {loading ? 'Loading categories...' : 'No grievance categories found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: New Category */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create Grievance Classification</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Architecture Track</label>
                <select
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TRACK_A_INTERNAL">Track A — Internal BizPermit Grievance</option>
                  <option value="TRACK_B_STATUTORY_TRACKING">Track B — External Statutory Monitoring</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Classification Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PORTAL_BUG"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 font-mono uppercase focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.default_sla_hours}
                    onChange={(e) => setFormData({ ...formData, default_sla_hours: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Classification Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Portal Malfunction or Technical Glitch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of grievances falling under this category..."
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. GPCB, DIC"
                    value={formData.department_code}
                    onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {submitting ? 'Creating...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminGrievanceCategoriesPage;
