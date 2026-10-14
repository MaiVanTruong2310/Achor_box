import { customerRequest } from './customerClient';
export interface CustomerAddress { id: string; label: string; recipientName: string; phone: string; addressLine: string; installationNote: string | null; isDefault: boolean }
export type AddressInput = Omit<CustomerAddress, 'id'>;
export const customerApi = {
  addresses: () => customerRequest<CustomerAddress[]>('/customer/addresses'),
  saveAddress: (id: string | null, body: AddressInput) => customerRequest<CustomerAddress>(`/customer/addresses${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }),
  deleteAddress: (id: string) => customerRequest<void>(`/customer/addresses/${id}`, { method: 'DELETE' })
};
