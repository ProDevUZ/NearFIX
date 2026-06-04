import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { ImageIcon } from "lucide-react-native";
import { colors, iconSizes, radius } from "../../theme";

export function GalleryGrid({ items = [] }) {
  if (!items.length) {
    return (
      <View style={styles.empty}>
        <ImageIcon size={iconSizes.lg} color={colors.subtle} strokeWidth={2.4} />
        <Text style={styles.emptyText}>Ish namunalari tez orada qo'shiladi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.slice(0, 3).map((item, index) => (
        <View key={item.id} style={[styles.item, index === 0 && styles.largeItem]}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={styles.overlay}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 10
  },
  item: {
    flex: 1,
    height: 106,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface
  },
  largeItem: {
    flex: 1.25
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: "rgba(15,113,157,0.72)"
  },
  title: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900"
  },
  empty: {
    minHeight: 92,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  }
});
