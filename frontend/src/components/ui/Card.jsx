import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white border border-stone-200/80 rounded-lg shadow-sm hover:border-brand-sage/40 transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`p-5 border-b border-stone-100 flex items-center justify-between ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-brand-charcoal">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardBody = ({ children, className = '' }) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardContent = CardBody;

export const CardTitle = ({ children, className = '' }) => {
  return <h3 className={`text-base font-semibold text-brand-charcoal ${className}`}>{children}</h3>;
};

export const CardFooter = ({ children, className = '' }) => {
  return <div className={`p-4 bg-brand-cream/40 border-t border-stone-100 rounded-b-lg ${className}`}>{children}</div>;
};
