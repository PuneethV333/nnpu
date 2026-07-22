import React from "react";
import { useAuth } from "@/src/hooks/useAuth";
import Student from "@/components/profile-page/Student";
import Teacher from "@/components/profile-page/Teacher";
import Admin from "@/components/profile-page/Admin";

const Profile = () => {
  const { role } = useAuth();

  switch (role) {
    case "Student":
      return <Student />;
    case "Admin":
      return <Admin />;
    case "Teacher":
      return <Teacher />;
    }
    return <Student />;
};

export default Profile;
