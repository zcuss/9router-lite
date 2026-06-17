export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function VouchersAliasPage() {
  redirect("/dashboard/admin/vouchers");
}
