"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import Sidebar from "../Sidebar";
import Header from "../Header";

function getToastStyle(type) {
  if (type === "success") return { wrapper: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]", Icon: CheckCircle2 };
  if (type === "error") return { wrapper: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]", Icon: XCircle };
  if (type === "warning") return { wrapper: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]", Icon: AlertTriangle };
  return { wrapper: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)]", Icon: Info };
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-main)]">
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const { wrapper, Icon } = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm shadow-sm ${wrapper}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                {n.title ? <p className="mb-0.5 text-xs font-semibold">{n.title}</p> : null}
                <p className="whitespace-pre-wrap break-words text-xs">{n.message}</p>
              </div>
              {n.dismissible && (
                <button
                  type="button"
                  onClick={() => removeNotification(n.id)}
                  className="opacity-70 hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  <X className="size-3.5" strokeWidth={2.25} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex h-full min-w-0 flex-1 flex-col">
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            pathname === "/dashboard/basic-chat" ? "" : "p-6 lg:p-8"
          } ${pathname === "/dashboard/basic-chat" ? "flex flex-col overflow-hidden" : ""}`}
        >
          <div
            className={`${
              pathname === "/dashboard/basic-chat"
                ? "flex h-full w-full flex-1 flex-col"
                : "mx-auto w-full max-w-7xl"
            }`}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
