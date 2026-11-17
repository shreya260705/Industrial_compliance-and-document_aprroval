import React, { useState } from 'react';
import { complianceAPI } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { Button } from '../ui/Button';
import { X, PlusCircle, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  'ENVIRONMENTAL',
  'LABOUR_SAFETY',
  'BOILER_PRESSURE_VESSEL',
  'FIRE_SAFETY',
  'GROUNDWATER',
  'HAZARDOUS_MATERIALS',
  'TAX_LEGAL',
  'INTERNAL_AUDIT',
];

const FREQUENCIES = [
  'ANNUAL',
  'HALF_YEARLY',
  'QUARTERLY',
  'MONTHLY',
  'ONE_TIME',
];

export const CustomObligationModal = ({ isOpen, onClose, onCreated }) => {
  const { locations, currentBusiness } = useFacility();
  const [formData, setFormData] = useState({
    title: '',
    facility_id: '',
    compliance_category: 'ENVIRONMENTAL',
    frequency: 'ANNUAL',
    due_date: '',
    description: '',
    department_code: 'INTERNAL',
    is_statutory: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.facility_id) {
      setError('Please select a business location / facility');
      return;
    }
    if (!formData.due_date) {
      setError('Please select a due date');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await complianceAPI.createObligation({
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
        business_id: currentBusiness?.id,
      });
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create custom obligation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="bg-brand-cream/80 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-brand-deep-sage" />
            <h2 className="text-sm font-bold text-brand-charcoal">
              Create Internal Compliance Obligation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Select Business Location <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.facility_id}
              onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              required
            >
              <option value="">-- Choose Business Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.address?.city || 'Facility'}, {loc.address?.state_code || ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Obligation Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Quarterly Stack Emission Test & Flue Gas Analysis"
              className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Category</label>
              <select
                value={formData.compliance_category}
                onChange={(e) => setFormData({ ...formData, compliance_category: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                First Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-deep-sage"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Department / Body</label>
              <input
                type="text"
                value={formData.department_code}
                onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                placeholder="e.g. SPCB / DISH / INTERNAL"
                className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Scope / Instructions</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide compliance parameters, testing standards, or internal protocol..."
              className="w-full p-2 border border-stone-300 rounded-lg focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Obligation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
