import { CONFIG } from '@/constants';
import type { Property, User, Loan } from '@/types';

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = CONFIG.API_URL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Get all properties
  async getProperties(owner?: string) {
    const query = owner ? `?owner=${owner}` : '';
    return this.request<{ success: boolean; properties: Property[] }>(`/properties${query}`);
  }

  // Get single property
  async getProperty(propertyId: string) {
    return this.request<{ success: boolean; property: Property }>(`/properties/${propertyId}`);
  }

  // Submit new property
  async submitProperty(data: {
    owner: string;
    address: string;
    value: number;
    description?: string;
    tokenSupply?: number;
  }) {
    return this.request<{ success: boolean; property: Property }>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Delist property (for untokenization)
  async delistProperty(owner: string, propertyId: string) {
    return this.request<{ success: boolean; message: string }>(`/properties/${propertyId}/delist`, {
      method: 'POST',
      body: JSON.stringify({ owner }),
    });
  }

  // Get loan details
  async getLoan(userAddress: string) {
    return this.request<{ success: boolean; loan: Loan }>(`/loans/${userAddress}`);
  }

  // Get user profile
  async getUser(accountId: string) {
    return this.request<{ success: boolean; user: User }>(`/users/${accountId}`);
  }
}

export const api = new APIClient();
