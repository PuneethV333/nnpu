import React, { lazy } from 'react';
import { useAuth } from '@/src/hooks/useAuth';

const Student = lazy(() => import('@/components/fees-page/main/Student'));
const Admin = lazy(() => import('@/components/fees-page/main/Admin'));

const Fees = () => {
  const { role } = useAuth();

  switch (role) {
    case 'Student':
      return <Student />;
    case 'Admin':
      return <Admin />;
    default:
      return null;
  }
};

export default Fees;
