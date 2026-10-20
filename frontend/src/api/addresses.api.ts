import { apiRequest } from './client';
import type { Address } from '../types';

export interface AddressFormInput {
  label?: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export const addressesApi = {
  async listAddresses(): Promise<Address[]> {
    const res = await apiRequest<{ addresses: Address[] }>('/addresses');
    return res.data.addresses;
  },

  async createAddress(input: AddressFormInput): Promise<Address> {
    const res = await apiRequest<{ address: Address }>('/addresses', {
      method: 'POST',
      body: input,
    });
    return res.data.address;
  },

  async updateAddress(id: string, input: Partial<AddressFormInput>): Promise<Address> {
    const res = await apiRequest<{ address: Address }>(`/addresses/${id}`, {
      method: 'PATCH',
      body: input,
    });
    return res.data.address;
  },

  async deleteAddress(id: string): Promise<void> {
    await apiRequest<null>(`/addresses/${id}`, {
      method: 'DELETE',
    });
  },
};
