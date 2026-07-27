import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMyInvoices,
  createPaymentOrder,
  verifyPayment,
  getFeeStructure,
  createFeeStructure,
  updateFeeStructure,
  generateInvoices,
  getStudentInvoices,
  getInvoice,
} from '../api/fees';

export const useGetMyInvoices = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['my-invoices'],
    queryFn: getMyInvoices,
    enabled: isAuthenticated,
  });
};

export const useGetFeeStructure = (sectionId: string, academicYearId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['fee-structure', sectionId, academicYearId],
    queryFn: () => getFeeStructure(sectionId, academicYearId),
    enabled: isAuthenticated && (role === 'Admin' || role === 'Teacher') && !!sectionId && !!academicYearId,
  });
};

export const useCreateFeeStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structure'] });
    },
  });
};

export const useUpdateFeeStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof updateFeeStructure>[1]) =>
      updateFeeStructure(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structure'] });
    },
  });
};

export const useGenerateInvoices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInvoices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
    },
  });
};

export const useGetStudentInvoices = (studentId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['student-invoices', studentId],
    queryFn: () => getStudentInvoices(studentId),
    enabled: isAuthenticated && role === 'Admin' && !!studentId,
  });
};

export const useGetInvoice = (id: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    enabled: isAuthenticated && !!id,
  });
};

export const useCreatePaymentOrder = () => {
  return useMutation({ mutationFn: createPaymentOrder });
};

export const useVerifyPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
    },
  });
};