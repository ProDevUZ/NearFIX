import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors, iconSizes, radius } from "../../theme";

export function ReviewCard({ review }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.author}>{review.author}</Text>
          <Text style={styles.date}>{review.date} - yakunlangan buyurtma</Text>
        </View>
        <View style={styles.rating}>
          <Star size={iconSizes.sm} color={colors.warning} fill={colors.warning} />
          <Text style={styles.ratingText}>{review.rating}</Text>
        </View>
      </View>
      <Text style={styles.text}>{review.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  author: {
    color: colors.text,
    fontWeight: "900"
  },
  date: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  ratingText: {
    color: colors.text,
    fontWeight: "900"
  },
  text: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: "600"
  }
});
