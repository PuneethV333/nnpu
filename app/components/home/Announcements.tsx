import React from "react";
import { View, Text, Image } from "react-native";
import { latest } from "$/types/announcement";
import { TYPE_COPY } from "@/components/announcements/announcementMeta";
import { styles } from "$/style/AnnouncementCard";

const AnnouncementCard = ({ name, profilePic, title, body, type }: latest) => {
  const typeCopy = TYPE_COPY[type] ?? TYPE_COPY.Normal;

  return (
    <View style={styles.card}>
      <View style={[styles.typeBadge, { backgroundColor: typeCopy.color + "1A" }]}>
        <Text style={[styles.typeBadgeText, { color: typeCopy.color }]}>
          {typeCopy.label}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.body} numberOfLines={3}>
        {body}
      </Text>

      <View style={styles.authorRow}>
        {profilePic ? (
          <Image source={{uri: profilePic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.authorName} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
};

export default AnnouncementCard;

