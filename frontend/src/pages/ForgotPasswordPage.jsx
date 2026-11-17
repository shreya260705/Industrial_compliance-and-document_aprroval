import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { authAPI } from '../services/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ForgotPasswordPage = () => {
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    setSuccessMessage('');

    try {
      await authAPI.requestPasswordReset(data.email);
      setSuccessMessage('If an account exists for this email, reset instructions have been sent.');
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Unable to process request.';
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
        <h2 className="text-xl font-bold text-brand-charcoal">Reset your password</h2>
        <p className="text-xs text-stone-500 mt-1">Enter the email linked to your BizPermit account.</p>
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

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">Email address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@company.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>}
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
                Send reset link
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
