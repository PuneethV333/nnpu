import {
  LoginResponseSchema,
  MeResponseSchema,
  type LoginResponse,
  type MeResponse,
} from '@/types/auth';
import { api } from '@/lib/apiClient';

export const loginApi = async (
  authId: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await api.post('/auth/login', { authId, password });
  return LoginResponseSchema.parse(res.data);
};

export async function getMe(): Promise<MeResponse> {
  const res = await api.get('/auth/me');
  return MeResponseSchema.parse(res.data);
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
