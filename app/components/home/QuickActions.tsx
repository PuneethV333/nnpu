
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "$/style/QuickActions";

export type QuickAction = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  route:
    | "/(tabs)/attendance"
    | "/(tabs)/marks"
    | "/(tabs)/fees"
    | "/(tabs)/announcements"
    | "/(tabs)/school";
};

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "Mark Attendance", icon: "checkmark-done-outline", color: "#2563EB", route: "/(tabs)/attendance" },
  { label: "Enter Marks", icon: "create-outline", color: "#16A34A", route: "/(tabs)/marks" },
];

type Props = {
  // Optional so existing <QuickActions /> call sites (Teacher.tsx) are
  // unaffected. Admin.tsx passes its own list to add "Manage Fees".
  actions?: QuickAction[];
};

const QuickActions = ({ actions = DEFAULT_ACTIONS }: Props) => {
  const router = useRouter();
  // Four cards in one row leave ~80px each, so labels wrap badly; two per row
  // reads better once there are more than three actions.
  const wrap = actions.length > 3;

  return (
    <View style={[styles.row, wrap && { flexWrap: "wrap" }]}>
      {actions.map((action) => (
        <Pressable
          key={action.route}
          style={[styles.card, wrap && { flexBasis: "46%" }]}
          onPress={() => router.push(action.route)}
        >
          <View style={[styles.iconWrap, { backgroundColor: action.color + "1A" }]}>
            <Ionicons name={action.icon} size={18} color={action.color} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

export default QuickActions;