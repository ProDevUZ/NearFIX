import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ShieldCheck, Smartphone } from "lucide-react-native";
import { PrimaryButton } from "../../components/ui/Button";
import { ROUTES } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";
import { colors, iconSizes, radius } from "../../theme";
import { openPrivacyPolicy, openTerms } from "../../utils/legalLinks";
import { AuthScreenLayout, authStyles } from "./AuthScreenLayout";
import {
  authErrorMessage,
  isValidUzPhone,
  normalizeUzPhone,
  passwordValidationMessage
} from "./authHelpers";

export function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  async function handleLogin() {
    if (loading) return;

    const normalizedPhone = normalizeUzPhone(phone);
    if (!isValidUzPhone(normalizedPhone)) {
      Alert.alert("Telefon raqam noto'g'ri", "Telefon raqamni to'liq kiriting: masalan 90 123 45 67.");
      return;
    }

    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      Alert.alert("Parol noto'g'ri", passwordError);
      return;
    }

    setLoading(true);
    try {
      const result = await login(normalizedPhone, password);
      if (!result.ok) {
        Alert.alert(
          "Kirish amalga oshmadi",
          authErrorMessage(result, "Backend bilan ulanishda xatolik yuz berdi.")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Xush kelibsiz!"
      copy="Telefon raqam va parolingiz bilan tizimga kiring."
    >
      <View style={styles.trustRow}>
        <View style={styles.trustPill}>
          <ShieldCheck size={iconSizes.sm} color={colors.secondary} strokeWidth={2.6} />
          <Text style={styles.trustText}>Xavfsiz kirish</Text>
        </View>
        <View style={styles.trustPill}>
          <Smartphone size={iconSizes.sm} color={colors.primary} strokeWidth={2.6} />
          <Text style={styles.trustText}>Telefon orqali</Text>
        </View>
      </View>

      <View style={authStyles.inputCard}>
        <Text style={authStyles.inputLabel}>Telefon raqam</Text>
        <View style={authStyles.phoneRow}>
          <View style={authStyles.countryCode}>
            <Text style={authStyles.countryText}>+998</Text>
          </View>
          <TextInput
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="90 123 45 67"
            placeholderTextColor={colors.subtle}
            style={[authStyles.input, authStyles.phoneInput]}
            value={phone}
            editable={!loading}
            onChangeText={setPhone}
          />
        </View>

        <Text style={authStyles.inputLabel}>Parol</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="current-password"
          placeholder="Parolingiz"
          placeholderTextColor={colors.subtle}
          secureTextEntry
          style={authStyles.input}
          value={password}
          editable={!loading}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <Pressable
          disabled={loading}
          onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
        >
          <Text style={styles.forgotLink}>Parolni unutdingizmi?</Text>
        </Pressable>
      </View>

      <PrimaryButton
        disabled={loading}
        title={loading ? "Kirilmoqda..." : "Kirish"}
        onPress={handleLogin}
      />

      <View style={authStyles.linkRow}>
        <Text style={authStyles.mutedText}>Hisobingiz yo'qmi?</Text>
        <Pressable disabled={loading} onPress={() => navigation.navigate(ROUTES.REGISTER)}>
          <Text style={authStyles.linkText}>Ro'yxatdan o'tish</Text>
        </Pressable>
      </View>

      <View style={styles.legalConsent}>
        <Text style={styles.terms}>Davom etish orqali </Text>
        <Pressable onPress={openTerms}>
          <Text style={styles.legalLink}>Foydalanish shartlari</Text>
        </Pressable>
        <Text style={styles.terms}> va </Text>
        <Pressable onPress={openPrivacyPolicy}>
          <Text style={styles.legalLink}>Maxfiylik siyosati</Text>
        </Pressable>
        <Text style={styles.terms}>ga rozilik bildirasiz.</Text>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  forgotLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    paddingVertical: 4
  },
  terms: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 18
  },
  legalConsent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center"
  },
  legalLink: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    textDecorationLine: "underline"
  }
});
