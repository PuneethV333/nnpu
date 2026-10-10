import React, { lazy } from "react";
import { View } from "react-native";
import { RoleScreen } from "@/components/ui/RoleScreen";
import { ProgressCardSkeleton, SectionTileSkeleton } from "@/components/ui/skeletons";

const Student = lazy(() => import("@/components/home/main/Student"));
const Admin = lazy(() => import("@/components/home/main/Admin"));
const Teacher = lazy(() => import("@/components/home/main/Teacher"));

const Loading = () => (
  <View className="bg-gray-50">
    <ProgressCardSkeleton />
    <SectionTileSkeleton count={3} />
  </View>
);

const Home = () => (
  <RoleScreen screens={{ Student, Admin, Teacher }} fallback={<Loading />} />
);

export default Home;