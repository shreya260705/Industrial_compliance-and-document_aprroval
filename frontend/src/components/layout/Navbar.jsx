import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFacility } from '../../context/FacilityContext';
import { Factory, LogOut, User, Bell, ChevronDown, Shield, Building2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { BusinessManagerModal } from '../business/BusinessManagerModal';
import { NotificationBell } from '../notifications/NotificationBell';

export const Navbar = () => {
  const { user, logout, isBusinessOwner } = useAuth();
  const { businesses, currentBusiness, selectBusiness, locations, currentLocation, setCurrentLocation } = useFacility();
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-brand-deep-sage flex items-center justify-center text-white font-bold text-lg shadow-sm border border-brand-sage/40">
                BP
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-brand-deep-sage">BIZPERMIT</span>
                <span className="hidden sm:inline-block text-[10px] tracking-wider font-semibold text-brand-walnut ml-2 uppercase px-1.5 py-0.5 bg-brand-pale-sage rounded">
                  India Workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Enterprise & Facility Switcher (for Business Owners) */}
          {isBusinessOwner && (
            <div className="hidden md:flex items-center gap-2">
              {/* Enterprise Switcher */}
              <div className="flex items-center gap-2 bg-brand-cream/60 py-1.5 px-3 rounded-md border border-stone-200 text-xs">
                <Building2 className="h-4 w-4 text-brand-deep-sage" />
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500 font-medium">Enterprise:</span>
                  {businesses.length > 0 ? (
                    <select
                      className="bg-transparent font-semibold text-brand-charcoal focus:outline-none cursor-pointer max-w-[160px] truncate"
                      value={currentBusiness?.id || ''}
                      onChange={(e) => {
                        const biz = businesses.find((b) => b.id === e.target.value);
                        if (biz) selectBusiness(biz);
                      }}
                    >
                      {businesses.map((biz) => (
                        <option key={biz.id} value={biz.id}>
                          {biz.legal_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-stone-500">None</span>
                  )}
                  <button
                    onClick={() => setIsBizModalOpen(true)}
                    className="text-[10px] bg-brand-pale-sage hover:bg-brand-sage/30 text-brand-deep-sage font-bold px-1.5 py-0.5 rounded transition-colors ml-1"
                    title="Manage Enterprises"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Facility Switcher */}
              <div className="flex items-center gap-2 bg-brand-cream/60 py-1.5 px-3 rounded-md border border-stone-200 text-xs">
                <Building2 className="h-4 w-4 text-brand-walnut" />
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500 font-medium">Location:</span>
                  {locations.length > 0 ? (
                    <select
                      className="bg-transparent font-semibold text-brand-charcoal focus:outline-none cursor-pointer max-w-[140px] truncate"
                      value={currentLocation?.id || ''}
                      onChange={(e) => {
                        const loc = locations.find((l) => l.id === e.target.value);
                        if (loc) setCurrentLocation(loc);
                      }}
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.location_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-stone-500">None</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Department Officer Scope Pill */}
          {user?.role === 'DEPARTMENT_OFFICER' && (
            <div className="hidden md:flex items-center gap-2 bg-brand-pale-sage/60 border border-brand-sage/40 py-1.5 px-3 rounded-md text-xs font-mono">
              <Shield className="h-4 w-4 text-brand-deep-sage" />
              <span className="font-bold text-brand-deep-sage">
                {user?.officer_profile?.department_code || 'UNASSIGNED DEPT'}
              </span>
              <span className="text-stone-400">•</span>
              <span className="font-medium text-brand-charcoal">
                State: {user?.officer_profile?.jurisdiction_code || 'NATIONAL'}
              </span>
              {user?.officer_profile?.badge_number && (
                <>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-500 text-[10px]">
                    Badge: {user.officer_profile.badge_number}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Super Admin Governance Pill */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="hidden md:flex items-center gap-2 bg-rose-50 border border-rose-200 py-1.5 px-3 rounded-md text-xs font-mono">
              <Shield className="h-4 w-4 text-rose-700" />
              <span className="font-bold text-rose-700">NATIONAL GOVERNANCE</span>
              <span className="text-stone-400">•</span>
              <span className="text-rose-900 text-[11px] font-sans font-medium">All 36 States & UTs</span>
            </div>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-brand-charcoal">{user.full_name}</div>
                  <div className="text-[10px] text-stone-500 flex items-center justify-end gap-1 font-mono">
                    <Badge variant={user.role === 'SUPER_ADMIN' ? 'demo' : 'default'} size="xs">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-stone-500 hover:text-brand-deep-sage hover:bg-stone-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-medium text-brand-deep-sage hover:text-brand-charcoal px-3 py-1.5 rounded-md hover:bg-stone-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-medium bg-brand-deep-sage text-white px-3 py-1.5 rounded-md hover:bg-[#283b31] shadow-sm"
                >
                  Register Business
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enterprise Manager Modal */}
      <BusinessManagerModal
        isOpen={isBizModalOpen}
        onClose={() => setIsBizModalOpen(false)}
      />
    </header>
  );
};
