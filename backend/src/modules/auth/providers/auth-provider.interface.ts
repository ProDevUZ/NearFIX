export type OtpDeliveryResult = {
  providerMessageId?: string;
};

export interface OtpDeliveryProvider {
  sendOtp(phone: string, code?: string): Promise<OtpDeliveryResult | void>;
}

export interface AuthProvider extends OtpDeliveryProvider {
  verifyOtp(phone: string, code: string): Promise<boolean>;
}
