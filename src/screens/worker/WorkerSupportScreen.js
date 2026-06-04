import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { WorkerSupportCard } from "../../components/executor/WorkerSupportCard";
import { Card } from "../../components/marketplace/ServiceCard";
import { createSupportTicketApi } from "../../services/support/supportService";
import { useAuthStore } from "../../store/authStore";
import { Header } from "../../components/ui/Header";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { colors, radius } from "../../theme";

export function WorkerSupportScreen() {
  const token = useAuthStore((state) => state.session?.token);

  async function handleCreateTicket() {
    if (!token) {
      Alert.alert("Tizimga kiring", "Supportga murojaat qilish uchun qayta tizimga kiring.");
      return;
    }

    const result = await createSupportTicketApi(token, {
      reason: "Operatsion yordam",
      message: "Worker app support card orqali murojaat yaratildi."
    });

    Alert.alert(
      result.ok ? "Murojaat yaratildi" : "Murojaat yuborilmadi",
      result.ok ? "Support jamoasi murojaatingizni ko'rib chiqadi." : result.message || "Qayta urinib ko'ring."
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Support" />
      <WorkerSupportCard onPress={handleCreateTicket} />
      <Card>
        <SectionHeader title="Tezkor sabablar" />
        {["Mijoz javob bermayapti", "Manzil topilmadi", "Bekor qilish muammosi"].map((item) => (
          <View key={item} style={styles.reason}>
            <Text style={styles.reasonText}>{item}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 112,
    gap: 16,
    backgroundColor: colors.background
  },
  reason: {
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  reasonText: {
    color: colors.text,
    fontWeight: "900"
  }
});
