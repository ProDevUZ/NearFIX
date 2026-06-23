import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ROUTES } from "../constants/routes";
import { useAuthStore } from "../store/authStore";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { SessionInvalidatedScreen } from "../screens/auth/SessionInvalidatedScreen";
import { OnboardingBookingScreen } from "../screens/onboarding/OnboardingBookingScreen";
import { OnboardingTrustScreen } from "../screens/onboarding/OnboardingTrustScreen";

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  const invalidation = useAuthStore((state) => state.invalidation);

  return (
    <Stack.Navigator
      key={invalidation ? "invalidated" : "auth"}
      initialRouteName={invalidation ? ROUTES.SESSION_INVALIDATED : ROUTES.ONBOARDING_TRUST}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={ROUTES.ONBOARDING_TRUST} component={OnboardingTrustScreen} />
      <Stack.Screen name={ROUTES.ONBOARDING_BOOKING} component={OnboardingBookingScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={ROUTES.SESSION_INVALIDATED} component={SessionInvalidatedScreen} />
    </Stack.Navigator>
  );
}
