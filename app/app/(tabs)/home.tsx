import React, { lazy } from 'react'
import { useAuth } from '@/src/hooks/useAuth';
const Student = lazy(() => import('@/components/home/main/Student'))
const Admin = lazy(() => import('@/components/home/main/Admin'))
const Teacher = lazy(() => import('@/components/home/main/Teacher'))

const Home = () => {
  const {role} = useAuth()
  
  switch(role){
    case 'Admin':
      return <Admin/>
    case 'Student':
      return <Student/>
    case 'Teacher':
      return <Teacher/>
    default: 
      break
  }
}

export default Home