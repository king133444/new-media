import http from './http';

export interface CreateOrderPayload {
  title: string;
  description?: string;
  type: 'VIDEO' | 'DESIGN' | 'H5' | 'ANIMATION' | 'AUDIO' | 'OTHER';
  amount: number;
  budget?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline?: string; // ISO string
  contentRequirements?: string;
  requirements?: string; // JSON string
  tags?: string; // JSON string
}

export const ordersApi = {
  create: async (payload: CreateOrderPayload) => {
    const { data } = await http.post('/orders', payload);
    return data;
  },
};

export default ordersApi;


