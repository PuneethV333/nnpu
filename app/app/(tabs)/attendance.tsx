import React, { lazy } from 'react'
import { useAuth } from '@/src/hooks/useAuth';
const Student = lazy(() => import('@/components/attendance-page/main/Student-Attendance'))
const Teacher = lazy(() => import('@/components/attendance-page/main/Teacher-Attendance'))

const Attendance = () => {
  const {role} = useAuth()
  
  switch (role) {
    case 'Student':
      return <Student/>
    case 'Teacher':
      return <Teacher/>
    // case 'Admin
  }
}

export default Attendance