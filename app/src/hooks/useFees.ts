import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getMyInvoices, createPaymentOrder, verifyPayment } from '../api/fees';

export const useGetMyInvoices = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['my-invoices'],
    queryFn: getMyInvoices,
    enabled: isAuthenticated,
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