import React, { lazy } from "react";
import { RoleScreen } from "@/components/ui/RoleScreen";
import { SectionTileSkeleton, ChipRowSkeleton } from "@/components/ui/skeletons";
import { View } from "react-native";

const Student = lazy(
  () => import("@/components/attendance-page/main/Student-Attendance"),
);
const Teacher = lazy(
  () => import("@/components/attendance-page/main/Teacher-Attendance"),
);
const Admin = lazy(() => import("@/components/attendance-page/main/Admin"));

/**
 * Skeleton matching Teacher-Attendance's first screenful: section tiles, then
 * the subject chips. Matching the real layout is what makes the first tap feel
 * instant instead of blank-then-pop.
 */
const Loading = () => (
  <View className="bg-gray-50" style={{ marginTop: 20 }}>
    <SectionTileSkeleton />
    <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
      <ChipRowSkeleton />
    </View>
  </View>
);

const Attendance = () => (
  <RoleScreen
    screens={{ Student, Teacher, Admin }}
    fallback={<Loading />}
  />
);

export default Attendance;