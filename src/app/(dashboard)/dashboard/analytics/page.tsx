"use client";

import { useState } from "react";
import { useSafeTranslations } from "@/shared/hooks/useSafeTranslations";
import ProviderUtilizationTab from "./ProviderUtilizationTab";
import SearchAnalyticsTab from "./SearchAnalyticsTab";
import CompressionAnalyticsTab from "./CompressionAnalyticsTab";
import AutoRoutingAnalyticsTab from "./AutoRoutingAnalyticsTab";
import ComboHealthTab from "./ComboHealthTab";

const TABS = [
  { id: "utilization", label: "Utilization", icon: "monitoring" },
  { id: "search", label: "Search", icon: "search" },
  { id: "compression", label: "Compression", icon: "compress" },
  { id: "auto-routing", label: "Auto-Routing", icon: "auto_awesome" },
  { id: "combos", label: "Combos", icon: "layers" },
];

export default function AnalyticsPage() {
  useSafeTranslations("analytics");
  const [activeTab, setActiveTab] = useState("utilization");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Analytics</h1>
          <p className="mt-1 text-sm text-text-muted">Usage, cost, and performance metrics.</p>
        </div>

        <div className="flex items-center gap-1 bg-bg-subtle p-1 rounded-xl border border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-surface text-text-main shadow-sm border border-border/50"
                  : "text-text-muted hover:text-text-main hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === "utilization" && <ProviderUtilizationTab />}
        {activeTab === "search" && <SearchAnalyticsTab />}
        {activeTab === "compression" && <CompressionAnalyticsTab />}
        {activeTab === "auto-routing" && <AutoRoutingAnalyticsTab />}
        {activeTab === "combos" && <ComboHealthTab />}
      </div>
    </div>
  );
}

