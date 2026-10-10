import React, { lazy } from "react";
import { View } from "react-native";
import { RoleScreen } from "@/components/ui/RoleScreen";
import {
  SectionTileSkeleton,
  ChipRowSkeleton,
} from "@/components/ui/skeletons";

const Admin = lazy(() => import("@/components/mark-page/main/Admin"));
const Teacher = lazy(() => import("@/components/mark-page/main/Teacher"));
const Student = lazy(() => import("@/components/mark-page/main/Student"));

/** Matches MarkEntry's cascade: section tiles, then subject chips. */
const Loading = () => (
  <View className="bg-gray-50" style={{ marginTop: 20 }}>
    <SectionTileSkeleton />
    <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
      <ChipRowSkeleton />
    </View>
  </View>
);

const Marks = () => (
  <RoleScreen screens={{ Admin, Teacher, Student }} fallback={<Loading />} />
);

export default Marks;