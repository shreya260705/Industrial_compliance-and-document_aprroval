import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand-deep-sage text-white hover:bg-[#283b31] focus:ring-brand-sage shadow-sm',
    secondary: 'bg-brand-pale-sage text-brand-charcoal hover:bg-[#d9e2d3] border border-stone-200 focus:ring-brand-deep-sage',
    accent: 'bg-brand-amber text-brand-charcoal font-semibold hover:bg-[#c27616] focus:ring-brand-amber shadow-sm',
    outline: 'border border-brand-deep-sage text-brand-deep-sage hover:bg-brand-pale-sage focus:ring-brand-deep-sage',
    ghost: 'text-brand-charcoal hover:bg-stone-200/50 focus:ring-stone-400',
    danger: 'bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-500',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
