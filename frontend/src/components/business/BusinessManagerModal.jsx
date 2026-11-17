import React, { useState } from 'react';
import { useFacility } from '../../context/FacilityContext';
import { Card, CardHeader, CardBody, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Building, Plus, CheckCircle, Shield, AlertCircle, X, ExternalLink } from 'lucide-react';

export const BusinessManagerModal = ({ isOpen, onClose }) => {
  const { businesses, currentBusiness, selectBusiness, createBusiness, updateBusiness } = useFacility();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    entity_type: 'PRIVATE_LIMITED',
    pan: '',
    gstin: '',
    cin: '',
    udyam_registration_number: '',
    industry_sector: 'Manufacturing',
    nic_code: '2011',
    business_description: '',
    contact_email: '',
    contact_phone: '',
    registered_office_address: {
      address_line1: '',
      city: '',
      district: '',
      state_code: 'IN-MH',
      pincode: '',
    },
  });

  if (!isOpen) return null;

  const handleInputChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddressChange = (field, val) => {
    setFormData((prev) => ({
      ...prev,
      registered_office_address: {
        ...prev.registered_office_address,
        [field]: val,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await createBusiness(formData);
      setShowCreateForm(false);
      setFormData({
        legal_name: '',
        trade_name: '',
        entity_type: 'PRIVATE_LIMITED',
        pan: '',
        gstin: '',
        cin: '',
        udyam_registration_number: '',
        industry_sector: 'Manufacturing',
        nic_code: '2011',
        business_description: '',
        contact_email: '',
        contact_phone: '',
        registered_office_address: {
          address_line1: '',
          city: '',
          district: '',
          state_code: 'IN-MH',
          pincode: '',
        },
      });
    } catch (err) {
      const errDetail = err.response?.data?.errors;
      if (errDetail && typeof errDetail === 'object') {
        const firstKey = Object.keys(errDetail)[0];
        setErrorMsg(`${firstKey}: ${errDetail[firstKey]}`);
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to register enterprise entity.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-brand-deep-sage text-white">
          <div className="flex items-center gap-2.5">
            <Building className="h-5 w-5 text-brand-amber" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">Enterprise Entity Workspace</h3>
              <p className="text-[11px] text-stone-200">Switch between enterprises or register a new legal entity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!showCreateForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Registered Enterprises ({businesses.length})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add New Enterprise
                </Button>
              </div>

              {businesses.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-lg p-6">
                  <Building className="h-10 w-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-brand-charcoal">No enterprises registered yet</p>
                  <p className="text-xs text-stone-500 mt-1 mb-4">
                    Register your corporate legal entity to manage business locations, apply for clearances, and store vault documents.
                  </p>
                  <Button size="sm" onClick={() => setShowCreateForm(true)}>
                    Register First Enterprise
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {businesses.map((biz) => {
                    const isSelected = currentBusiness?.id === biz.id;
                    const completion = biz.completion_percentage ?? 0;
                    return (
                      <div
                        key={biz.id}
                        onClick={() => selectBusiness(biz)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-deep-sage bg-brand-pale-sage/40 ring-1 ring-brand-deep-sage'
                            : 'border-stone-200 hover:border-brand-sage bg-white hover:bg-stone-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-brand-charcoal">{biz.legal_name}</h4>
                              {isSelected && (
                                <span className="inline-flex items-center text-[10px] font-bold text-brand-deep-sage bg-brand-pale-sage px-2 py-0.5 rounded-full border border-brand-sage/40">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-2">
                              <span>PAN: <strong className="font-mono text-stone-700">{biz.pan}</strong></span>
                              <span>•</span>
                              <span>Type: <strong className="text-stone-700">{biz.entity_type}</strong></span>
                              {biz.gstin && (
                                <>
                                  <span>•</span>
                                  <span>GSTIN: <strong className="font-mono text-stone-700">{biz.gstin}</strong></span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Completion meter */}
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono font-bold text-brand-walnut">
                              {completion}% Complete
                            </span>
                            <div className="w-20 bg-stone-200 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  completion >= 80
                                    ? 'bg-emerald-600'
                                    : completion >= 50
                                    ? 'bg-brand-amber'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {biz.registered_office_address?.state_code && (
                          <div className="text-[11px] text-stone-500 mt-2 border-t border-stone-100 pt-2 flex items-center justify-between">
                            <span>
                              {biz.registered_office_address.city || ''}{' '}
                              ({biz.registered_office_address.state_code})
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              ID: {biz.id?.substring(0, 8)}...
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Enterprise Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-deep-sage">
                  Register New Industrial Enterprise
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                    value={formData.legal_name}
                    onChange={(e) => handleInputChange('legal_name', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Trade Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Organics"
                    value={formData.trade_name}
                    onChange={(e) => handleInputChange('trade_name', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Entity Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => handleInputChange('entity_type', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  >
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="PRIVATE_LIMITED">Private Limited Company</option>
                    <option value="PUBLIC_LIMITED">Public Limited Company</option>
                    <option value="OTHER">Other Statutory Entity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    PAN (Permanent Account Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={formData.pan}
                    onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-md uppercase focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={formData.gstin}
                    onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-md uppercase focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">CIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={21}
                    placeholder="e.g. U12345MH2020PTC123456"
                    value={formData.cin}
                    onChange={(e) => handleInputChange('cin', e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 border border-stone-300 rounded-md uppercase focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="compliance@enterprise.in"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                  />
                </div>
              </div>

              {/* Registered Address */}
              <div className="pt-2 border-t border-stone-200">
                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wide block mb-2">
                  Registered Office Address
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Address Line 1"
                      value={formData.registered_office_address.address_line1}
                      onChange={(e) => handleAddressChange('address_line1', e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.registered_office_address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="District"
                      value={formData.registered_office_address.district}
                      onChange={(e) => handleAddressChange('district', e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Pincode"
                      value={formData.registered_office_address.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-brand-deep-sage"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={loading}>
                  Save & Register Entity
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>Multi-tenant enterprise isolation active</span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
