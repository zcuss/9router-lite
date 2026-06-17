import { DashboardLayout } from "@/shared/components";
import RoleSync from "@/shared/components/RoleSync";

export default function DashboardRootLayout({ children }) {
  return (
    <RoleSync>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleSync>
  );
}

