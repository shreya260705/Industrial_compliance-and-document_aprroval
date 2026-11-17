import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Shield,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.listUsers({
        page,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      if (res.data?.success) {
        setUsers(res.data.data);
        setPagination(res.data.meta?.pagination || {});
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    const confirmMsg = newStatus
      ? `Reactivate account for ${user.email}?`
      : `Suspend account for ${user.email}? The user will be immediately blocked from logging in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminAPI.updateUserStatus(user.id, { is_active: newStatus });
      fetchUsers();
      if (detailUser?.id === user.id) {
        setDetailUser((prev) => ({ ...prev, is_active: newStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Status update failed.');
    }
  };

  const handleViewDetail = async (user) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setDetailUser(null);
    try {
      const res = await adminAPI.getUserDetail(user.id);
      if (res.data?.success) {
        setDetailUser(res.data.data);
      }
    } catch (err) {
      alert('Could not load user profile details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-charcoal">Platform User Registry</h1>
            <Badge variant="demo" size="sm">
              SUPER_ADMIN
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Governance and account lifecycle control for Business Owners, Scrutiny Officers, and Platform Administrators.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh List
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
                placeholder="Search by full name, email, or phone number..."
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
                <option value="">All Account Roles</option>
                <option value="BUSINESS_OWNER">Business Owners</option>
                <option value="DEPARTMENT_OFFICER">Department Officers</option>
                <option value="SUPER_ADMIN">Super Administrators</option>
              </select>

              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500">Loading user registry...</div>
          ) : users.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">User / Contact</th>
                  <th className="p-3.5">Platform Role</th>
                  <th className="p-3.5">Linked Enterprises</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Registered On</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-brand-charcoal">{u.full_name}</div>
                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3 w-3 text-stone-400" /> {u.email}
                      </div>
                      {u.phone_number && (
                        <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="h-2.5 w-2.5 text-stone-400" /> {u.phone_number}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          u.role === 'SUPER_ADMIN'
                            ? 'demo'
                            : u.role === 'DEPARTMENT_OFFICER'
                            ? 'info'
                            : 'default'
                        }
                        size="xs"
                      >
                        {u.role}
                      </Badge>
                      {u.officer_profile?.department_code && (
                        <div className="text-[10px] text-stone-500 mt-1 font-mono font-semibold">
                          {u.officer_profile.department_code} ({u.officer_profile.jurisdiction_code || 'National'})
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {u.role === 'BUSINESS_OWNER' ? (
                        <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-brand-deep-sage" />
                          <span>{u.linked_enterprises_count || 0} Enterprise(s)</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-500 font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleViewDetail(u)}
                        title="View Full Profile"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Inspect
                      </Button>
                      {u.role !== 'SUPER_ADMIN' && (
                        <Button
                          size="xs"
                          variant={u.is_active ? 'danger' : 'secondary'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400">No users match your criteria.</div>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-deep-sage" />
                <h3 className="font-bold text-sm text-brand-charcoal">User Account Dossier</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {detailLoading ? (
                <div className="text-center py-8 text-stone-400">Loading user profile and records...</div>
              ) : detailUser ? (
                <>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-mono">Full Name</div>
                      <div className="font-bold text-brand-charcoal">{detailUser.full_name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-mono">Role</div>
                      <Badge variant="demo" size="xs">
                        {detailUser.role}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-mono">Email Address</div>
                      <div className="font-mono text-stone-700">{detailUser.email}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-mono">Account Status</div>
                      <div className="font-semibold">{detailUser.is_active ? 'Active' : 'Suspended'}</div>
                    </div>
                  </div>

                  {/* Linked Enterprises */}
                  {detailUser.role === 'BUSINESS_OWNER' && (
                    <div>
                      <h4 className="font-bold text-brand-charcoal mb-2">Registered Enterprises & Locations</h4>
                      {detailUser.enterprises?.length > 0 ? (
                        <div className="space-y-2">
                          {detailUser.enterprises.map((biz) => (
                            <div key={biz.id} className="p-3 bg-brand-cream/40 rounded border border-stone-200">
                              <div className="font-bold text-brand-deep-sage">{biz.legal_name}</div>
                              <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                                PAN: {biz.pan} • GSTIN: {biz.gstin || 'N/A'} • {biz.entity_type}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-stone-400 italic">No enterprises registered by this user.</div>
                      )}
                    </div>
                  )}

                  {/* Officer Profile */}
                  {detailUser.role === 'DEPARTMENT_OFFICER' && (
                    <div>
                      <h4 className="font-bold text-brand-charcoal mb-2">Department Assignment Scope</h4>
                      <div className="p-3 bg-brand-cream/40 rounded border border-stone-200 space-y-1 font-mono">
                        <div>Department: <span className="font-bold">{detailUser.officer_profile?.department_code}</span></div>
                        <div>Jurisdiction: <span className="font-bold">{detailUser.officer_profile?.jurisdiction_code}</span></div>
                        <div>Designation: <span className="font-bold">{detailUser.officer_profile?.designation}</span></div>
                        <div>Badge Number: <span className="font-bold">{detailUser.officer_profile?.badge_number}</span></div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
