import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  History,
  Search,
  Filter,
  Shield,
  RefreshCw,
  Clock,
  Terminal,
  Activity,
} from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listAuditLogs({
        page,
        actor_role: roleFilter || undefined,
        action: actionFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) {
        setLogs(res.data.data);
        setPagination(res.data.meta?.pagination || {});
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch platform audit trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">Platform Audit Logs & Security History</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN EXCLUSIVE
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Immutable append-only chronological log of all sensitive administrative, officer, and applicant actions.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Logs
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by action, target collection, or target ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-deep-sage bg-white"
              >
                <option value="">All Actor Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="DEPARTMENT_OFFICER">DEPARTMENT_OFFICER</option>
                <option value="BUSINESS_OWNER">BUSINESS_OWNER</option>
              </select>

              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading audit history...</div>
          ) : logs.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Timestamp (UTC)</th>
                  <th className="p-3.5">Actor Role / User</th>
                  <th className="p-3.5">Action Executed</th>
                  <th className="p-3.5">Target Collection & ID</th>
                  <th className="p-3.5">Origin IP Address</th>
                  <th className="p-3.5">Changes / Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-stone-600">
                      {log.timestamp ? new Date(log.timestamp).toISOString() : '—'}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          log.actor_role === 'SUPER_ADMIN'
                            ? 'demo'
                            : log.actor_role === 'DEPARTMENT_OFFICER'
                            ? 'info'
                            : 'default'
                        }
                        size="xs"
                      >
                        {log.actor_role || 'SYSTEM'}
                      </Badge>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {log.actor_user_id || 'System Process'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-xs font-bold text-brand-charcoal">{log.action}</span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <span className="font-semibold text-brand-deep-sage">{log.target_collection}</span>
                      {log.target_id && (
                        <div className="text-stone-400 text-[10px]">ID: {log.target_id}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-stone-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="p-3.5 max-w-xs">
                      {log.delta && Object.keys(log.delta).length > 0 ? (
                        <pre className="text-[10px] font-mono bg-stone-50 p-1.5 rounded border border-stone-200 overflow-x-auto truncate max-h-16">
                          {JSON.stringify(log.delta)}
                        </pre>
                      ) : (
                        <span className="text-stone-400 text-[10px] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">No audit log records found.</div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="p-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <div>
                Page {pagination.page} of {pagination.total_pages} ({pagination.total_records} total)
              </div>
              <div className="space-x-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
