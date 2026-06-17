import crypto from "node:crypto";

function boolEnv(name, fallback = false) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getMidtransConfig() {
  return {
    merchantId: process.env.MIDTRANS_MERCHANT_ID || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    isProduction: boolEnv("MIDTRANS_IS_PRODUCTION", false),
  };
}

export function midtransBaseUrl(isProduction = false) {
  return isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
}

export function midtransApiBaseUrl(isProduction = false) {
  return isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

export function isMidtransConfigured() {
  const cfg = getMidtransConfig();
  return !!(cfg.merchantId && cfg.clientKey && cfg.serverKey);
}

export async function createMidtransSnapTransaction({ orderId, grossAmount, firstName, email }) {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) throw new Error("MIDTRANS_SERVER_KEY missing");
  const res = await fetch(`${midtransApiBaseUrl(cfg.isProduction)}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${cfg.serverKey}:`).toString("base64")}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: firstName || "User",
        email: email || undefined,
      },
      enabled_payments: ["gopay", "qris", "bank_transfer", "echannel", "bca_va", "bni_va", "bri_va", "permata_va", "credit_card"],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_messages?.join(", ") || data.status_message || `Midtrans error ${res.status}`);
  }
  return data;
}

export function verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey }) {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) return false;
  const expected = crypto.createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${cfg.serverKey}`).digest("hex");
  return expected === signatureKey;
}

export async function getMidtransTransactionStatus(orderId) {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) throw new Error("MIDTRANS_SERVER_KEY missing");
  const res = await fetch(`${midtransApiBaseUrl(cfg.isProduction)}/v2/${orderId}/status`, {
    method: "GET",
    headers: {
      authorization: `Basic ${Buffer.from(`${cfg.serverKey}:`).toString("base64")}`,
      accept: "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.status_message || `Midtrans API status check error ${res.status}`);
  }
  return data;
}
