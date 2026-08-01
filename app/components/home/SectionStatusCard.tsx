import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useCheckStatus } from "$/hooks/useAttendance";
import { styles } from "$/style/SectionStatusCard";
import type { Section } from "$/types/section";

type Props = {
  section: Section;
  date: string; // local YYYY-MM-DD, from toISODate()
  isWorkingDay: boolean;
};

// ASSUMED status shape — see types/attendance-status.ts. Adjust the pill
// logic below once you confirm the real /attendance/status response.
const getPill = (
  isWorkingDay: boolean,
  isLoading: boolean,
  status: { isMarked: boolean; isLocked: boolean } | undefined,
) => {
  if (!isWorkingDay) {
    return { label: "Non-working day", bg: "#6B72801A", color: "#6B7280" };
  }
  if (isLoading) return null;
  if (status?.isLocked) {
    return { label: "Locked", bg: "#6B72801A", color: "#6B7280" };
  }
  if (status?.isMarked) {
    return { label: "Marked", bg: "#16A34A1A", color: "#16A34A" };
  }
  return { label: "Not marked", bg: "#D977061A", color: "#D97706" };
};

const SectionStatusCard = ({ section, date, isWorkingDay }: Props) => {
  const router = useRouter();
  const { data, isLoading } = useCheckStatus(section.id, date);

  const pill = getPill(isWorkingDay, isLoading, data);
  const displayName = `${section.className} - ${section.name}`;

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({ pathname: "/attendance", params: { sectionId: section.id } })
      }
    >
      <View style={styles.left}>
        <Text style={styles.className} numberOfLines={1}>
          {displayName}
        </Text>
        {section.isClassTeacher ? <Text style={styles.classTeacherStar}>★</Text> : null}
      </View>

      {isWorkingDay && isLoading ? (
        <ActivityIndicator size="small" color="#6B7280" />
      ) : pill ? (
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export default SectionStatusCard;