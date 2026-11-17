import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { adminGrievancesAPI } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminGrievanceAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [grievanceId, setGrievanceId] = useState('');
  const [action, setAction] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGrievancesAPI.listAuditLogs({
        grievance_id: grievanceId.trim() || undefined,
        action: action.trim() || undefined,
        limit: 100
      });
      if (res.data?.success) {
        setLogs(res.data.data?.logs || res.data.data?.results || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.response?.data?.error?.message || 'Failed to inspect audit ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
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
            <span>Audit Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Application-Level Append-Only Audit Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">
            Statutory, tamper-evident audit trail capturing all submissions, status transitions, queries, and administrative rulings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Audit Security Notice */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-lg flex items-start space-x-3">
        <Lock className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-emerald-300">
            Immutable Audit Trail Architecture (Collection 23: grievance_audit_logs)
          </div>
          <p className="text-slate-300">
            All records in this ledger are strictly append-only. Modification and deletion operations are blocked at the application repository layer.
            Entries are indexed across grievance ID, timestamp, and actor identity for statutory accountability.
          </p>
        </div>
      </div>

      {/* Filter Form */}
      <Card className="p-4 bg-white">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              placeholder="Filter by Grievance ID / Code..."
              value={grievanceId}
              onChange={(e) => setGrievanceId(e.target.value)}
              className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full text-xs border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Audit Actions</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="STATUS_CHANGED">STATUS_CHANGED</option>
              <option value="CLARIFICATION_REQUESTED">CLARIFICATION_REQUESTED</option>
              <option value="CLARIFICATION_RESPONDED">CLARIFICATION_RESPONDED</option>
              <option value="NOTE_ADDED">NOTE_ADDED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="REASSIGNED">REASSIGNED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REOPENED">REOPENED</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
              <option value="FEEDBACK_SUBMITTED">FEEDBACK_SUBMITTED</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" size="sm" className="w-full bg-primary-600 hover:bg-primary-700 text-white">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter Logs
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setGrievanceId('');
                setAction('');
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Grievance Ref</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Remarks / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id || log._id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-primary-700">
                      {log.grievance_id || log.grievance_code || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {log.from_status && log.to_status ? (
                        <div className="text-[11px] font-mono">
                          <span className="text-gray-500">{log.from_status}</span>
                          <span className="text-gray-400 mx-1">&rarr;</span>
                          <span className="text-primary-700 font-bold">{log.to_status}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{log.performed_by_name || 'System / User'}</div>
                      <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">
                        {log.performed_by}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-gray-700 truncate">{log.notes || JSON.stringify(log.details || {})}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {loading ? 'Inspecting ledger...' : 'No audit entries match filter criteria.'}
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

export default AdminGrievanceAuditPage;
