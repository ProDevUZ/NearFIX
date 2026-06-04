import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { colors, iconSizes, radius, shadow } from "../../theme";

const avatarColors = ["#EFE0FF", "#FFD8EB", "#DDEBFF"];
const textColors = ["#7C3DFF", "#D81B71", "#2868D8"];

export function IncomingOrderCard({ request, disabled, onAccept, index = 0 }) {
  const initials = request.clientName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.card, disabled && styles.disabled]}>
      <View style={[styles.clientIcon, { backgroundColor: avatarColors[index % avatarColors.length] }]}>
        <Text style={[styles.avatarText, { color: textColors[index % textColors.length] }]}>{initials || "JP"}</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.client}>{request.clientName}</Text>
        <Text style={styles.service} numberOfLines={1}>
          {request.service || "Service"} - {request.distance || "0.8 km"} - {request.createdAt || "2 min ago"}
        </Text>
      </View>
      <Text style={styles.payment}>{request.estimatedPayment}</Text>
      <Pressable
        disabled={disabled}
        onPress={disabled ? undefined : onAccept}
        style={({ pressed }) => [styles.acceptButton, disabled && styles.acceptDisabled, pressed && styles.pressed]}
      >
        <ArrowRight size={iconSizes.sm} color={colors.white} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 66,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    ...shadow
  },
  disabled: {
    opacity: 0.55
  },
  clientIcon: {
    width: 41,
    height: 41,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "900"
  },
  titleBlock: {
    flex: 1
  },
  client: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  service: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600"
  },
  payment: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900"
  },
  acceptButton: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: "#18B354",
    alignItems: "center",
    justifyContent: "center"
  },
  acceptDisabled: {
    backgroundColor: colors.subtle
  },
  pressed: {
    opacity: 0.78
  }
});
