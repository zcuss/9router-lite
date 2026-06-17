import { NextResponse } from "next/server";
import { getProviderConfig, listProviders } from "@/lib/auth/oauthProviders";
import { loadSettingsAuth } from "@/lib/auth/magicLink";
import { getMidtransConfig, isMidtransConfigured } from "@/lib/payment/midtrans";

export const dynamic = "force-dynamic";

export async function GET() {
  const oauth = listProviders().map((p) => {
    const cfg = getProviderConfig(p.id);
    return { ...p, enabled: !!cfg?.enabled };
  });
  const smtp = loadSettingsAuth();
  const midtrans = getMidtransConfig();
  return NextResponse.json({
    oauth,
    magicLink: { enabled: smtp.enabled, host: smtp.enabled ? smtp.host : null },
    password: { enabled: true, envAdminOnly: false },
    midtrans: {
      enabled: isMidtransConfigured(),
      clientKey: midtrans.clientKey,
      isProduction: midtrans.isProduction,
      baseJsUrl: midtrans.isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js",
    },
  });
}
