import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Button";
import { requestRegisterOtp } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme";
import { AuthScreenLayout, authStyles } from "./AuthScreenLayout";
import {
  authErrorMessage,
  isValidOtp,
  isValidUzPhone,
  normalizeUzPhone,
  passwordValidationMessage
} from "./authHelpers";

export function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const register = useAuthStore((state) => state.register);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  async function requestCode({ showSuccess = false } = {}) {
    if (loading) return false;

    const normalizedPhone = normalizeUzPhone(phone);
    if (!isValidUzPhone(normalizedPhone)) {
      Alert.alert("Telefon raqam noto'g'ri", "Telefon raqamni to'liq kiriting: masalan 90 123 45 67.");
      return false;
    }

    setLoading(true);
    try {
      const result = await requestRegisterOtp(normalizedPhone);
      if (!result.ok) {
        if (result.code === "OTP_COOLDOWN" && result.retryAfter) {
          setResendSeconds(result.retryAfter);
        }
        Alert.alert("SMS yuborilmadi", authErrorMessage(result, "Qayta urinib ko'ring."));
        return false;
      }

      setVerifiedPhone(normalizedPhone);
      setResendSeconds(result.resendIn || 0);
      setCode("");
      if (showSuccess) Alert.alert("Kod yuborildi", "Yangi tasdiqlash kodi SMS orqali yuborildi.");
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneContinue() {
    const requested = await requestCode();
    if (requested) setStep(2);
  }

  function handleOtpContinue() {
    if (!isValidOtp(code)) {
      Alert.alert("OTP kod kerak", "SMS orqali kelgan tasdiqlash kodini to'liq kiriting.");
      return;
    }
    setStep(3);
  }

  async function handleRegister() {
    if (loading) return;

    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      Alert.alert("Parol noto'g'ri", passwordError);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Parollar mos emas", "Parol va parolni tasdiqlash maydonlari bir xil bo'lishi kerak.");
      return;
    }

    setLoading(true);
    try {
      const result = await register(verifiedPhone, code.trim(), password);
      if (!result.ok) {
        Alert.alert(
          "Ro'yxatdan o'tish amalga oshmadi",
          authErrorMessage(result, "Backend bilan ulanishda xatolik yuz berdi.")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (loading) return;
    if (step === 1) {
      navigation.goBack();
      return;
    }
    setStep(step - 1);
  }

  return (
    <AuthScreenLayout
      title="Ro'yxatdan o'tish"
      copy={
        step === 1
          ? "Telefon raqamingizga tasdiqlash kodi yuboramiz."
          : step === 2
            ? `${verifiedPhone} raqamiga yuborilgan kodni kiriting.`
            : "Hisobingiz uchun xavfsiz parol yarating."
      }
    >
      <Text style={authStyles.stepText}>{step} / 3 bosqich</Text>

      <View style={authStyles.inputCard}>
        {step === 1 ? (
          <>
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
                onSubmitEditing={handlePhoneContinue}
              />
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={authStyles.inputLabel}>OTP kod</Text>
            <TextInput
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={12}
              placeholder="SMS kodi"
              placeholderTextColor={colors.subtle}
              style={authStyles.input}
              value={code}
              editable={!loading}
              onChangeText={setCode}
              onSubmitEditing={handleOtpContinue}
            />
            <Pressable
              disabled={loading || resendSeconds > 0}
              onPress={() => requestCode({ showSuccess: true })}
            >
              <Text
                style={[
                  authStyles.resendText,
                  (loading || resendSeconds > 0) && authStyles.resendTextDisabled
                ]}
              >
                {loading
                  ? "Yuborilmoqda..."
                  : resendSeconds > 0
                    ? `Qayta yuborish (${resendSeconds})`
                    : "Qayta yuborish"}
              </Text>
            </Pressable>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={authStyles.inputLabel}>Parol</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Kamida 8 ta belgi"
              placeholderTextColor={colors.subtle}
              secureTextEntry
              style={authStyles.input}
              value={password}
              editable={!loading}
              onChangeText={setPassword}
            />
            <Text style={authStyles.inputLabel}>Parolni tasdiqlang</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Parolni qayta kiriting"
              placeholderTextColor={colors.subtle}
              secureTextEntry
              style={authStyles.input}
              value={confirmPassword}
              editable={!loading}
              onChangeText={setConfirmPassword}
              onSubmitEditing={handleRegister}
            />
          </>
        ) : null}
      </View>

      <PrimaryButton
        disabled={loading}
        title={
          loading
            ? step === 3
              ? "Hisob yaratilmoqda..."
              : "Yuborilmoqda..."
            : step === 1
              ? "OTP kod olish"
              : step === 2
                ? "Davom etish"
                : "Ro'yxatdan o'tish"
        }
        onPress={step === 1 ? handlePhoneContinue : step === 2 ? handleOtpContinue : handleRegister}
      />
      <SecondaryButton disabled={loading} title="Orqaga" onPress={handleBack} />
    </AuthScreenLayout>
  );
}
