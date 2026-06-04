import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../theme";
import { PrimaryButton, SecondaryButton } from "../ui/Button";
import { Card } from "../marketplace/ServiceCard";

export function OrderCard({ order, onChat, providerMode = false }) {
  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{order.title}</Text>
          <Text style={styles.muted}>
            {providerMode ? "Mijoz" : "Usta"}: {order.provider}
          </Text>
        </View>
        <View style={[styles.statusBadge, order.status === "Kutilmoqda" && styles.pending]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      <Text style={styles.line}>{order.date}</Text>
      <Text style={styles.line}>{order.address}</Text>
      <Text style={styles.price}>{order.price}</Text>
      <View style={styles.actionRow}>
        <SecondaryButton title={providerMode ? "Rad etish" : "Chat"} onPress={onChat} style={styles.actionHalf} />
        <PrimaryButton title={providerMode ? "Qabul qilish" : "Batafsil"} onPress={() => {}} style={styles.actionHalf} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  titleBlock: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(44,216,165,0.14)"
  },
  pending: {
    backgroundColor: "rgba(255,176,32,0.16)"
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900"
  },
  line: {
    color: colors.muted,
    fontWeight: "700"
  },
  price: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  actionRow: {
    flexDirection: "row",
    gap: 10
  },
  actionHalf: {
    flex: 1
  }
});
