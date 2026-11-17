import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const AlertBanner = ({ type, message }) => {
  if (type === 'prototype' || !message) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-brand-amber p-4 mb-4 rounded-r-md">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-brand-amber shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700">{message}</div>
      </div>
    </div>
  );
};
