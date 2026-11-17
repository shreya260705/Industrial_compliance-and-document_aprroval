import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ListOrdered,
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { adminGrievancesAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminGrievanceEscalationRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: '',
    level: 'LEVEL_2',
    trigger_days: 7,
    description: '',
    target_department: '',
    auto_reassign: false,
    is_active: true
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGrievancesAPI.listEscalationRules({
        level: levelFilter || undefined
      });
      if (res.data?.success) {
        setRules(res.data.data?.rules || res.data.data?.results || []);
      }
    } catch (err) {
      console.error('Failed to load escalation rules:', err);
      setError(err.response?.data?.error?.message || 'Failed to load escalation rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [levelFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.rule_name.trim()) {
      alert('Please provide a rule name.');
      return;
    }
    try {
      setSubmitting(true);
      await adminGrievancesAPI.createEscalationRule({
        ...formData,
        rule_name: formData.rule_name.trim(),
        trigger_days: Number(formData.trigger_days) || 7,
        description: formData.description.trim()
      });
      setShowModal(false);
      setFormData({
        rule_name: '',
        level: 'LEVEL_2',
        trigger_days: 7,
        description: '',
        target_department: '',
        auto_reassign: false,
        is_active: true
      });
      fetchRules();
      alert('Escalation rule successfully established.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create escalation rule.');
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
            <span>Escalation Rules</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Statutory Escalation Rules & SLA Thresholds</h1>
          <p className="text-xs text-gray-500 mt-1">
            Define multi-tier escalation triggers across Level 1 (Officer), Level 2 (State Supervisory), and Level 3 (Super Admin).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Define Rule
          </Button>

          <Button variant="ghost" size="sm" onClick={fetchRules} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border">
        <span className="text-xs font-semibold text-gray-600">Filter Level:</span>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="text-xs border rounded p-1.5 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Tiers</option>
          <option value="LEVEL_1">Level 1 (Department Officer)</option>
          <option value="LEVEL_2">Level 2 (State Supervisory Authority)</option>
          <option value="LEVEL_3">Level 3 (Super Admin Oversight)</option>
        </select>
      </div>

      {/* Rules Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Trigger Threshold</th>
                <th className="py-3 px-4">Target Department</th>
                <th className="py-3 px-4">Auto Reassign</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <tr key={rule.id || rule._id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4">
                      <Badge variant={rule.level === 'LEVEL_3' ? 'danger' : rule.level === 'LEVEL_2' ? 'warning' : 'primary'}>
                        {rule.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{rule.rule_name}</div>
                      <div className="text-[11px] text-gray-500 max-w-md">{rule.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-gray-900">
                      {rule.trigger_days} Days Inactivity
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {rule.target_department || 'Same / Escalation Desk'}
                    </td>
                    <td className="py-3 px-4">
                      {rule.auto_reassign ? (
                        <span className="text-green-600 font-semibold">Enabled</span>
                      ) : (
                        <span className="text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {rule.is_active ? (
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
                    {loading ? 'Loading rules...' : 'No escalation rules found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: New Escalation Rule */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full bg-white space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Define Statutory Escalation Rule</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Escalation Tier</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="LEVEL_1">Level 1 — Department Officer SLA</option>
                  <option value="LEVEL_2">Level 2 — State Supervisory Authority</option>
                  <option value="LEVEL_3">Level 3 — Super Admin Directorate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Level 2 Inaction Escalation"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trigger Days Inactivity</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={formData.trigger_days}
                    onChange={(e) => setFormData({ ...formData, trigger_days: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Dept (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. STATE_APPELLATE"
                    value={formData.target_department}
                    onChange={(e) => setFormData({ ...formData, target_department: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Legal Basis</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Reference applicable procedural circular or escalation directive..."
                  className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="auto_reassign"
                  checked={formData.auto_reassign}
                  onChange={(e) => setFormData({ ...formData, auto_reassign: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="auto_reassign" className="text-xs text-gray-700">
                  Enable automated reassignment to senior pool upon breach
                </label>
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
                  {submitting ? 'Saving...' : 'Establish Rule'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminGrievanceEscalationRulesPage;
