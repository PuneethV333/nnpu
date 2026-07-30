import React, { lazy } from "react";
import { useAuth } from "@/src/hooks/useAuth";
const Student = lazy(
  () => import("@/components/attendance-page/main/Student-Attendance"),
);
const Teacher = lazy(
  () => import("@/components/attendance-page/main/Teacher-Attendance"),
);
const Admin = lazy(() => import("@/components/attendance-page/main/Admin"));

const Attendance = () => {
  const { role } = useAuth();

  switch (role) {
    case "Student":
      return <Student />;
    case "Teacher":
      return <Teacher />;
    case "Admin":
      return <Admin />;
  }
};

export default Attendance;
