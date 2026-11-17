import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    draft: 'bg-stone-100 text-stone-600 border-stone-200',
    submitted: 'bg-blue-50 text-blue-800 border-blue-200',
    under_scrutiny: 'bg-amber-50 text-amber-900 border-amber-300',
    clarification: 'bg-orange-100 text-orange-900 border-orange-300 font-semibold',
    resubmitted: 'bg-teal-50 text-teal-800 border-teal-300 font-semibold',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    rejected: 'bg-rose-50 text-rose-800 border-rose-300',
    demo: 'bg-brand-pale-sage text-brand-deep-sage border-brand-sage/50 font-mono text-[10px] uppercase font-bold tracking-wider',
    // Compliance Lifecycle Variants
    upcoming: 'bg-sky-50 text-sky-800 border-sky-300',
    due_soon: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
    due_today: 'bg-amber-100 text-amber-950 border-amber-400 font-bold animate-pulse',
    overdue: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    in_progress: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    completed: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    needs_confirmation: 'bg-purple-50 text-purple-800 border-purple-200 font-semibold',
    not_applicable: 'bg-stone-100 text-stone-400 border-stone-200',
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] uppercase font-semibold',
    indicative: 'bg-sky-50 text-sky-800 border-sky-300 font-mono text-[10px] uppercase',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded border ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
};
