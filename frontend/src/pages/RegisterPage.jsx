import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full Name is required'),
  email: z.string().email('Please enter a valid business email address'),
  phone_number: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const RegisterPage = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      await registerAuth({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        password: data.password,
        role: 'BUSINESS_OWNER',
      });
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
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
        <h2 className="text-xl font-bold text-brand-charcoal">Register Business Owner Account</h2>
        <p className="text-xs text-stone-500 mt-1">One Nation. One Industrial Compliance Workspace.</p>
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
                  Authorized Signatory / Full Name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    {...register('full_name')}
                    placeholder="Vikram Malhotra"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.full_name && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Official Business Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="compliance.lead@horizonauto.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Mobile Number 
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="tel"
                    {...register('phone_number')}
                    placeholder="+919876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.phone_number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Create Master Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="Min 8 chars with 1 letter & 1 number"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-deep-sage focus:border-transparent"
                  />
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="p-3 bg-brand-cream/60 rounded border border-stone-200 text-[11px] text-stone-600 leading-relaxed">
                <span className="font-semibold text-brand-charcoal">Role Notice:</span> Public registration is exclusively for industrial enterprise owners. Department Scrutiny Officers and Super Admins are provisioned by statutory invite only.
              </div>

              <Button
                type="submit"
                variant="accent"
                size="md"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Create Enterprise Account
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-stone-500 mt-4">
          Already have a registered account?{' '}
          <Link to="/login" className="font-semibold text-brand-deep-sage hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
