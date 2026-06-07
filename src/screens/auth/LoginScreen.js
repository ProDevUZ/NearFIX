import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ShieldCheck, Smartphone, Wrench } from "lucide-react-native";
import { Brand } from "../../components/ui/Brand";
import { PrimaryButton } from "../../components/ui/Button";
import { requestSmsCode } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { colors, iconSizes, radius, shadow } from "../../theme";

export function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loginWithPhone = useAuthStore((state) => state.loginWithPhone);

  function normalizePhone(value) {
    return value.trim().startsWith("+") ? value.trim() : `+998${value.replace(/[^\d]/g, "")}`;
  }

  async function handleContinue() {
    if (submitting) return;

    const cleanPhone = normalizePhone(phone);
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      Alert.alert("Ism familiya kerak", "Tizimga kirish uchun ism familiyangizni kiriting.");
      return;
    }

    if (cleanPhone.replace(/[^\d]/g, "").length < 12) {
      Alert.alert("Telefon raqam noto'g'ri", "Telefon raqamni to'liq kiriting: masalan 90 123 45 67.");
      return;
    }

    setSubmitting(true);
    try {
      if (otpRequested && cleanPhone === verifiedPhone && cleanName === verifiedName) {
        const code = otpCode.trim();
        if (code.length < 4) {
          Alert.alert("OTP kod kerak", "SMS orqali kelgan 4 xonali kodni kiriting.");
          return;
        }

        const loginResult = await loginWithPhone(cleanPhone, cleanName, code);
        if (!loginResult.ok) {
          Alert.alert("Login amalga oshmadi", loginResult.message || "Backend bilan ulanishda xatolik yuz berdi.");
        }
        return;
      }

      const smsResult = await requestSmsCode(cleanPhone);
      if (!smsResult.ok) {
        Alert.alert("SMS yuborilmadi", smsResult.message || "Qayta urinib ko'ring.");
        return;
      }

      setVerifiedPhone(cleanPhone);
      setVerifiedName(cleanName);
      setOtpRequested(true);
      setOtpCode("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandWrap}>
          <Brand />
        </View>
        <View style={styles.heroIcon}>
          <Wrench size={34} color={colors.white} strokeWidth={3} />
        </View>
        <Text style={styles.title}>Xush kelibsiz!</Text>
        <Text style={styles.copy}>Tizimga kirish yoki ro'yxatdan o'tish uchun telefon raqamingizni kiriting.</Text>

        <View style={styles.trustRow}>
          <View style={styles.trustPill}>
            <ShieldCheck size={iconSizes.sm} color={colors.secondary} strokeWidth={2.6} />
            <Text style={styles.trustText}>Admin tasdiqlaydi</Text>
          </View>
          <View style={styles.trustPill}>
            <Smartphone size={iconSizes.sm} color={colors.primary} strokeWidth={2.6} />
            <Text style={styles.trustText}>Telefon orqali</Text>
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Ism familiya</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Masalan: Ism Familiya"
            placeholderTextColor={colors.subtle}
            style={styles.input}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setOtpRequested(false);
              setOtpCode("");
            }}
          />

          <Text style={styles.inputLabel}>Telefon raqam</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>+998</Text>
            </View>
            <TextInput
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                setOtpRequested(false);
                setOtpCode("");
              }}
            />
          </View>

          {otpRequested ? (
            <>
              <Text style={styles.inputLabel}>OTP kod</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={8}
                placeholder="3243"
                placeholderTextColor={colors.subtle}
                style={styles.input}
                value={otpCode}
                onChangeText={setOtpCode}
              />
            </>
          ) : null}
        </View>

        <PrimaryButton
          title={submitting ? "Kutilmoqda..." : otpRequested ? "Kirish" : "OTP kod olish"}
          onPress={handleContinue}
        />
        <Text style={styles.demoHint}>Rol backend/admin tomonidan sessiyaga bog'lanadi.</Text>
        <Text style={styles.terms}>Davom etish orqali foydalanish shartlariga rozilik bildirasiz.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
    justifyContent: "center",
    alignItems: "stretch"
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 6
  },
  heroIcon: {
    alignSelf: "center",
    width: 82,
    height: 82,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "rgba(44,216,165,0.22)",
    ...shadow
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center"
  },
  trustRow: {
    flexDirection: "row",
    gap: 10
  },
  trustPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  trustText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900"
  },
  inputCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    ...shadow
  },
  inputLabel: {
    color: colors.text,
    fontWeight: "800"
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  countryCode: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  countryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  input: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  terms: {
    textAlign: "center",
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 18
  },
  demoHint: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  }
});
