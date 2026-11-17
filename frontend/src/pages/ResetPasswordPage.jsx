import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { authAPI } from '../services/api';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long').regex(/[A-Za-z]/, 'Password must include at least one letter').regex(/[0-9]/, 'Password must include at least one number'),
  confirmPassword: z.string().min(8, 'Confirm your new password'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    if (!token) {
      setServerError('Missing password reset token. Please request a fresh reset link.');
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      await authAPI.resetPassword({
        token,
        password: data.password,
        confirm_password: data.confirmPassword,
      });
      navigate('/login', { replace: true });
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Unable to reset password.';
      setServerError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/login" className="inline-flex items-center gap-2 text-brand-deep-sage font-semibold text-sm mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <h2 className="text-xl font-bold text-brand-charcoal">Set a new password</h2>
        <p className="text-xs text-stone-500 mt-1">Choose a strong password to secure your BizPermit account.</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-md">
          <CardBody className="p-6">
            {!token && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md">
                Missing reset token. Please request a new link from the sign-in page.
              </div>
            )}

            {serverError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">New password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">Confirm password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.confirmPassword && <p className="text-[11px] text-rose-600 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading} disabled={!token}>
                Update password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
