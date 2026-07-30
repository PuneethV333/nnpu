import { z } from 'zod';
import { LoginResponse, LoginResponseSchema, MeResponse, MeResponseSchema } from "$/types/auth";
import { api } from "./client";

export const studentArraySchema = z.array(z.object({ id: z.string(), name: z.string().nullable() }));

export type StudentArray = z.infer<typeof studentArraySchema>;

export const loginApi = async (authId: string, password: string): Promise<LoginResponse> => {
  const res = await api.post('/auth/login', { authId, password });
  return LoginResponseSchema.parse(res.data)
}

export async function getMe(): Promise<MeResponse> {
  const res = await api.get("/auth/me");
  return MeResponseSchema.parse(res.data);
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function changePassword(
  oldPassWord: string,
  newPassWord: string,
): Promise<LoginResponse> {
  const res = await api.post("/auth/change-password", {
    oldPassWord,
    newPassWord,
  });
  return LoginResponseSchema.parse(res.data);
}

export const getStudents = async (sectionId: string): Promise<StudentArray> => {
  return studentArraySchema.parse((await api.get('/auth/students-details', { params: { sectionId } })).data);
};
