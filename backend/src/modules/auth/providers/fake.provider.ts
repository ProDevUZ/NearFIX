import type { AuthProvider } from "./auth-provider.interface.js";

const FAKE_OTP_CODE = "3243";

export class FakeAuthProvider implements AuthProvider {
  async sendOtp(_phone: string, _code?: string) {
    return undefined;
  }

  async verifyOtp(_phone: string, code: string) {
    return code === FAKE_OTP_CODE;
  }
}
