import React, { lazy } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RoleScreen } from "@/components/ui/RoleScreen";
import { useAuth } from "@/src/hooks/useAuth";
import { styles } from "@/src/style/Teacher";
import {
  HomeHeaderSkeleton,
  MyClassCardSkeleton,
  QuickActionsSkeleton,
  DayChipSkeleton,
  ProgressCardSkeleton,
  MetricCardSkeleton,
  SectionStatusSkeleton,
  SkeletonStatRow,
  TimetableSkeleton,
  AnnouncementsRowSkeleton,
  SectionTitleSkeleton,
} from "@/components/ui/skeletons";

const Student = lazy(() => import("@/components/home/main/Student"));
const Admin = lazy(() => import("@/components/home/main/Admin"));
const Teacher = lazy(() => import("@/components/home/main/Teacher"));

/**
 * Home is the one tab whose layout differs per role, so a single skeleton
 * shape was always wrong for two of the three roles: a Student home has a
 * "My Class" card and an attendance progress card but no section tiles, while
 * Teacher/Admin homes have Quick Actions and no "My Class" card. `RoleScreen`
 * has already resolved `role` by the time this fallback renders, so it can be
 * shaped the same way the real screen is.
 */
const StudentSkeleton = () => (
  <>
    <HomeHeaderSkeleton />
    <DayChipSkeleton />
    <MyClassCardSkeleton />
    <ProgressCardSkeleton />

    <View style={styles.section}>
      <SectionTitleSkeleton width="38%" />
      <TimetableSkeleton />
    </View>

    <View style={styles.section}>
      <SectionTitleSkeleton width="45%" />
      <AnnouncementsRowSkeleton />
    </View>
  </>
);

const TeacherSkeleton = () => (
  <>
    <HomeHeaderSkeleton />
    <DayChipSkeleton />

    <View style={styles.section}>
      <SectionTitleSkeleton width="38%" />
      <TimetableSkeleton />
    </View>

    <View style={styles.section}>
      <SectionTitleSkeleton width="40%" />
      <SectionStatusSkeleton />
    </View>

    <View style={styles.section}>
      <SectionTitleSkeleton width="40%" />
      <QuickActionsSkeleton />
    </View>

    <View style={styles.section}>
      <SectionTitleSkeleton width="45%" />
      <AnnouncementsRowSkeleton />
    </View>
  </>
);

const AdminSkeleton = () => (
  <>
    <HomeHeaderSkeleton />

    <View style={{ paddingHorizontal: 16 }}>
      <SkeletonStatRow />
    </View>

    <DayChipSkeleton />

    {/* MetricCardSkeleton carries its own `marginHorizontal: 16`, so it is not
        wrapped in another padded view or it would indent twice. */}
    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <SectionTitleSkeleton width="30%" />
    </View>
    <MetricCardSkeleton count={4} />

    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <SectionTitleSkeleton width="40%" />
      <QuickActionsSkeleton count={4} wrap />
    </View>

    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <SectionTitleSkeleton width="45%" />
      <AnnouncementsRowSkeleton />
    </View>
  </>
);

const Loading = () => {
  const { role } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {role === "Admin" ? (
        <AdminSkeleton />
      ) : role === "Teacher" ? (
        <TeacherSkeleton />
      ) : (
        <StudentSkeleton />
      )}
    </SafeAreaView>
  );
};

const Home = () => (
  <RoleScreen screens={{ Student, Admin, Teacher }} fallback={<Loading />} />
);

export default Home;
