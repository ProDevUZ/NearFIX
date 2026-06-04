import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, shadow } from "../../theme";

export function PrimaryButton({ title, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.pressed, style]}>
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, style]}>
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

const baseButton = {
  minHeight: 54,
  borderRadius: radius.lg,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 18
};

const styles = StyleSheet.create({
  primary: {
    ...baseButton,
    backgroundColor: colors.secondary,
    ...shadow
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800"
  },
  secondary: {
    ...baseButton,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.75
  }
});
