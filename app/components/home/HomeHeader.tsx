import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "$/hooks/useAuth";
import { useGreeting } from "@/src/libs/useGreeting";
import { styles } from "$/style/HomeHeader";

type Props = {
  hasNotifications: boolean;
};

const HomeHeader = ({ hasNotifications }: Props) => {
  const router = useRouter();
  const { user } = useAuth();
  const greeting = useGreeting();

  const name = user?.details?.name ?? "";
  const profilePic = user?.details?.profilePic ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {name ? name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <View style={styles.textBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.bellButton}
        onPress={() => router.push("/notification")}
        accessibilityLabel="Notifications"
        hitSlop={12}
      >
        <Feather name="bell" size={22} color="#111827" />
        {hasNotifications ? <View style={styles.notificationDot} /> : null}
      </Pressable>
    </View>
  );
};

export default HomeHeader;