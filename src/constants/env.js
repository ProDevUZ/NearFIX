export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000",
  authEnabled: process.env.EXPO_PUBLIC_AUTH_ENABLED !== "false",
  paymentsEnabled: process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === "true",
  mockDataEnabled: process.env.EXPO_PUBLIC_ENABLE_MOCK_DATA === "true",
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || "",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || ""
};
