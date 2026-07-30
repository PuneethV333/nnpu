import React from "react";
import { useAuth } from "@/src/hooks/useAuth";
import Student from "@/components/profile-page/main/Student";
import Teacher from "@/components/profile-page/main/Teacher";
import Admin from "@/components/profile-page/main/Admin";

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
