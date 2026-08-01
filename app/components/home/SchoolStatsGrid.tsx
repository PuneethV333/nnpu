import React from "react";
import { View } from "react-native";
import type { CurrentUser } from "@/src/types/auth";
import { StatCard } from "../profile-page/StatCard";

type Props = {
  school: CurrentUser["school"];
};

const SchoolStatsGrid = ({ school }: Props) => {
  return (
    <View className="px-4">
      <View className="flex-row mb-2">
        <StatCard label="Students" value={school?.noOfStudents ?? 0} />
        <StatCard label="Teachers" value={school?.noOfTeacher ?? 0} />
      </View>
      <View className="flex-row">
        <StatCard label="Boys" value={school?.noOfBoys ?? 0} />
        <StatCard label="Girls" value={school?.noOfGirls ?? 0} />
      </View>
    </View>
  );
};

export default SchoolStatsGrid;