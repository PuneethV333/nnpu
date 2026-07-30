import React, { lazy } from 'react'
import { useAuth } from '@/src/hooks/useAuth';
const Admin = lazy(() => import('@/components/mark-page/main/Admin'))
const Teacher = lazy(() => import('@/components/mark-page/main/Teacher'))
const Student = lazy(() => import('@/components/mark-page/main/Student'))

const Marks = () => {
  const {role} = useAuth()
  
  switch (role) {
    case 'Admin':
      return <Admin/>
    case 'Teacher':
      return <Teacher/>
    case 'Student':
      return <Student/>
    default:
      break;
  }
}

export default Marks