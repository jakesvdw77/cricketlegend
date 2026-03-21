import api from './axiosConfig';
import { Field } from '../types';

export const fieldApi = {
  findAll: () => api.get<Field[]>('/fields').then(r => r.data),
  findById: (id: number) => api.get<Field>(`/fields/${id}`).then(r => r.data),
  create: (dto: Field) => api.post<Field>('/fields', dto).then(r => r.data),
  update: (id: number, dto: Field) => api.put<Field>(`/fields/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/fields/${id}`),
};
