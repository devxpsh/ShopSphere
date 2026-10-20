import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Star,
  AlertCircle,
  Phone,
  Edit3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addressesApi, AddressFormInput } from '../api/addresses.api';
import { getApiErrorMessage } from '../api/client';
import { Address } from '../types';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const EMPTY_FORM: AddressFormInput = {
  label: 'Home',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: 'Karnataka',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

export const AddressesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useAuth();

  const { data: addresses = [], isLoading: isAddressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.listAddresses(),
    enabled: Boolean(user),
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: AddressFormInput) =>
      addressesApi.createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetForm();
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<AddressFormInput>;
    }) => addressesApi.updateAddress(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetForm();
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(false);
    setFormError(null);
  };

  const handleEdit = (addr: Address) => {
    setFormData({
      label: addr.label || 'Home',
      recipientName: addr.recipientName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || 'India',
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      setFormError(
        'Please enter a valid 10-digit Indian mobile number starting with 6-9.'
      );
      return;
    }

    if (!/^[1-9]\d{5}$/.test(formData.postalCode.trim())) {
      setFormError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    const payload: AddressFormInput = {
      ...formData,
      phone: formData.phone.trim(),
      postalCode: formData.postalCode.trim(),
      line2: formData.line2?.trim() || undefined,
      landmark: formData.landmark?.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isUserLoading || (user && isAddressesLoading)) {
    return (
      <div
        className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-slate-200 rounded-2xl" />
          <div className="h-44 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to manage delivery addresses
        </h1>
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Saved Delivery Addresses
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage your Indian shipping addresses with verified 6-digit PIN
            codes
          </p>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...EMPTY_FORM,
                recipientName: user.fullName,
                phone: user.phone || '',
              });
              setEditingId(null);
              setIsFormOpen(true);
            }}
            className="btn-primary !py-2.5 !px-4 !text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add New Address
          </button>
        )}
      </div>

      {/* Add / Edit Address Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="addr-fullname"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Recipient Full Name *
              </label>
              <input
                id="addr-fullname"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.recipientName}
                onChange={(e) =>
                  setFormData({ ...formData, recipientName: e.target.value })
                }
                placeholder="e.g. Aarav Sharma"
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="addr-phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                10-Digit Mobile Number *
              </label>
              <input
                id="addr-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={10}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(/\D/g, ''),
                  })
                }
                placeholder="e.g. 9876543210"
                className="input-field !text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="addr-line1"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Flat, House No., Building, Street *
              </label>
              <input
                id="addr-line1"
                name="address-line1"
                type="text"
                autoComplete="address-line1"
                required
                value={formData.line1}
                onChange={(e) =>
                  setFormData({ ...formData, line1: e.target.value })
                }
                placeholder="Flat 402, Prestige Shantiniketan, Whitefield Main Rd"
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="addr-line2"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Area, Colony, Sector (Optional)
              </label>
              <input
                id="addr-line2"
                name="address-line2"
                type="text"
                autoComplete="address-line2"
                value={formData.line2 || ''}
                onChange={(e) =>
                  setFormData({ ...formData, line2: e.target.value })
                }
                placeholder="Hoodi Circle, Mahadevapura"
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="addr-landmark"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nearby Landmark (Optional)
              </label>
              <input
                id="addr-landmark"
                name="landmark"
                type="text"
                value={formData.landmark || ''}
                onChange={(e) =>
                  setFormData({ ...formData, landmark: e.target.value })
                }
                placeholder="Near Forum Shantiniketan Mall"
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="addr-city"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                City / District *
              </label>
              <input
                id="addr-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="Bengaluru"
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="addr-state"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                State / Union Territory *
              </label>
              <select
                id="addr-state"
                name="state"
                autoComplete="address-level1"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="input-field !text-xs"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="addr-pincode"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                6-Digit PIN Code *
              </label>
              <input
                id="addr-pincode"
                name="postal-code"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                required
                maxLength={6}
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    postalCode: e.target.value.replace(/\D/g, ''),
                  })
                }
                placeholder="560048"
                className="input-field !text-xs font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="addr-label"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Address Label
              </label>
              <select
                id="addr-label"
                value={formData.label || 'Home'}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="input-field !text-xs"
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Hostel / Campus">Hostel / Campus</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="addr-default"
              type="checkbox"
              checked={Boolean(formData.isDefault)}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor="addr-default"
              className="text-xs font-medium text-slate-700"
            >
              Make this my default delivery address
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary !py-2 !px-4 !text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary !py-2 !px-5 !text-xs"
            >
              {editingId ? 'Save Updated Address' : 'Save Delivery Address'}
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-3">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-base font-bold text-slate-900">
            No saved delivery addresses yet
          </p>
          <p className="text-xs text-slate-500">
            Add your home, office, or campus hostel address for rapid 1-click
            checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <article
              key={addr.id}
              className={`rounded-2xl bg-white border p-5 shadow-sm flex flex-col justify-between gap-4 ${
                addr.isDefault
                  ? 'border-brand-500 ring-1 ring-brand-500/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                      {addr.label || 'Address'}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  {addr.recipientName}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ''}
                  {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}
                  <br />
                  {addr.city}, {addr.state} —{' '}
                  <strong className="font-mono text-slate-900">
                    {addr.postalCode}
                  </strong>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>+91 {addr.phone}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(addr)}
                    className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: addr.id,
                          payload: { isDefault: true },
                        })
                      }
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-brand-600"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as Default
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(addr.id)}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
