import type { AuthProvider, OtpDeliveryResult } from "./auth-provider.interface.js";

const ESKIZ_SENDER = "4546";

type EskizAuthProviderOptions = {
  email: string;
  password: string;
  baseUrl: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
};

type EskizLoginResponse = {
  data?: {
    token?: string;
  };
};

type EskizSendResponse = {
  id?: string;
};

export class EskizAuthProvider implements AuthProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private token?: string;
  private tokenRequest?: Promise<string>;

  constructor(private readonly options: EskizAuthProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async login() {
    const body = new FormData();
    body.set("email", this.options.email);
    body.set("password", this.options.password);

    const response = await this.fetchFn(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Eskiz login failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EskizLoginResponse;
    const token = payload.data?.token;

    if (!token) {
      throw new Error("Eskiz login response does not contain a token");
    }

    this.token = token;
    return token;
  }

  private async getToken() {
    if (this.token) {
      return this.token;
    }

    if (!this.tokenRequest) {
      this.tokenRequest = this.login().finally(() => {
        this.tokenRequest = undefined;
      });
    }

    return this.tokenRequest;
  }

  async sendOtp(phone: string, code?: string): Promise<OtpDeliveryResult> {
    if (!code) {
      throw new Error("OTP code is required for Eskiz SMS delivery");
    }

    const token = await this.getToken();
    const body = new FormData();
    body.set("mobile_phone", phone.replace(/\D/g, ""));
    body.set("message", `NearFIX ilovasiga kirish uchun tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`);
    body.set("from", ESKIZ_SENDER);
    body.set("callback_url", "");

    const response = await this.fetchFn(`${this.baseUrl}/api/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body,
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Eskiz SMS send failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EskizSendResponse;

    return {
      providerMessageId: payload.id
    };
  }
}
