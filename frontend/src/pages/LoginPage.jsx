import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AlertCircle, Lock, Mail, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password is required'),
});

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      const userData = await login(data.email, data.password);
      let defaultDestination = '/dashboard';
      if (userData?.role === 'SUPER_ADMIN') {
        defaultDestination = '/admin/dashboard';
      } else if (userData?.role === 'DEPARTMENT_OFFICER') {
        defaultDestination = '/officer/dashboard';
      }
      const destination = location.state?.from?.pathname || defaultDestination;
      navigate(destination, { replace: true });
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.';
      setServerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    // Instant 1-click login for demo role switcher
    handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded bg-brand-deep-sage flex items-center justify-center text-white font-bold text-xl shadow-sm">
            BP
          </div>
          <span className="text-2xl font-bold tracking-tight text-brand-deep-sage">BIZPERMIT</span>
        </Link>
        <h2 className="text-xl font-bold text-brand-charcoal">Sign in to Compliance Workspace</h2>
        <p className="text-xs text-stone-500 mt-1">Multi-state industrial approvals and statutory monitoring</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-md">
          <CardBody className="p-6">
            {serverError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="compliance.lead@company.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Sign In to Portal
              </Button>

              <div className="text-right">
                <Link to="/forgot-password" className="text-[11px] font-semibold text-brand-deep-sage hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-stone-100">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-2 font-mono flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-sage" /> Quick Demo Role Switcher
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDemoCredentials('owner@horizonauto.in', 'Password123')}
                  className="text-left p-2.5 rounded border border-stone-200 bg-brand-cream/30 hover:bg-brand-pale-sage/40 transition-colors text-xs flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <div className="font-semibold text-brand-charcoal">Business Owner</div>
                    <div className="text-[10px] text-stone-500 font-mono">owner@horizonauto.in</div>
                  </div>
                  <span className="text-[10px] text-brand-deep-sage font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    1-Click Sign In →
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDemoCredentials('officer.gpcb@gujarat.gov.in', 'Password123')}
                  className="text-left p-2.5 rounded border border-stone-200 bg-brand-cream/30 hover:bg-brand-pale-sage/40 transition-colors text-xs flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <div className="font-semibold text-brand-charcoal">Department Scrutiny Officer (Gujarat)</div>
                    <div className="text-[10px] text-stone-500 font-mono">officer.gpcb@gujarat.gov.in</div>
                  </div>
                  <span className="text-[10px] text-brand-deep-sage font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    1-Click Sign In →
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDemoCredentials('admin@bizpermit.gov.in', 'Password123')}
                  className="text-left p-2.5 rounded border border-stone-200 bg-brand-cream/30 hover:bg-brand-pale-sage/40 transition-colors text-xs flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <div className="font-semibold text-brand-charcoal">Platform Super Admin</div>
                    <div className="text-[10px] text-stone-500 font-mono">admin@bizpermit.gov.in</div>
                  </div>
                  <span className="text-[10px] text-brand-deep-sage font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    1-Click Sign In →
                  </span>
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-stone-500 mt-4">
          Need to onboard a new industrial enterprise?{' '}
          <Link to="/register" className="font-semibold text-brand-deep-sage hover:underline">
            Register Business
          </Link>
        </p>
      </div>
    </div>
  );
};
