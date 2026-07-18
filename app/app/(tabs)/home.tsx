import React from 'react'
import { useAuth } from "@/src/hooks/useAuth";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  const { user, role } = useAuth();
  const name = user?.details?.name ?? "there";

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi, {name} 👋</Text>
      <Text style={styles.role}>Welcome {role}</Text>

      {role === "Student" && (
        <Text style={styles.hint}>
          Your attendance, fees, and report card will show up here.
        </Text>
      )}
      {role === "Teacher" && (
        <Text style={styles.hint}>
          Mark attendance and enter marks for your sections here.
        </Text>
      )}
      {role === "Admin" && (
        <Text style={styles.hint}>
          Manage onboarding, sections, and fee structures here.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  greeting: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  role: { fontSize: 14, color: "#666", marginBottom: 20 },
  hint: { fontSize: 15, color: "#333" },
});
