import { type PaymentAppConfigEntryFullyConfigured } from "../config-entry";

export const configEntryAll: PaymentAppConfigEntryFullyConfigured = {
  configurationName: "test",
  secretKey: "stripe-secret-key-placeholder",
  publishableKey: "stripe-publishable-key-placeholder",
  configurationId: "mock-id",
  webhookSecret: "stripe-webhook-token",
  webhookId: "webhook-id",
};
