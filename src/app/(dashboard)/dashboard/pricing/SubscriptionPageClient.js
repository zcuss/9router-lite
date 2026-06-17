"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Zap, Shield, Crown, Star, Loader2, Sparkles } from "lucide-react";
import PricingSettingsPage from "@/app/(dashboard)/dashboard/pricing/AdminPricingClient";

const FEATURE_ICONS = {
  "Access to all 9 models": <Sparkles size={14} strokeWidth={1.8} />,
};

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab");
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (tab === "rates") return; // Admin rates page handles itself
    loadSubscription();
  }, [tab]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load subscription");
      setUser(data.user);
      setCurrentPlan(data.plan);
      setPlans(data.plans || []);
      setIsAdmin(["admin", "dev"].includes(data.user?.role));
    } catch (e) {
      console.error("Subscription load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (subscribingPlan) return;
    setSubscribingPlan(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscribe failed");
      await loadSubscription();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubscribingPlan(null);
    }
  };

  if (tab === "rates") {
    return <PricingSettingsPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} strokeWidth={1.8} className="animate-spin text-text-muted" />
      </div>
    );
  }

  const userPlanId = user?.plan || "lite";
  const planOrder = ["lite", "standard", "pro", "max"];

  const planIcon = (id) => {
    switch (id) {
      case "max": return <Crown size={20} strokeWidth={1.8} />;
      case "pro": return <Star size={20} strokeWidth={1.8} />;
      case "standard": return <Shield size={20} strokeWidth={1.8} />;
      default: return <Zap size={20} strokeWidth={1.8} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-text-main">Choose Your Plan</h1>
        <p className="text-text-muted max-w-2xl mx-auto">
          Flexible pricing for every type of user. Cancel anytime, switch plans anytime.
        </p>
        {user && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-xs">
            <span className="text-text-muted">Signed in as</span>
            <span className="font-mono font-semibold text-text-main">{user.username}</span>
            <span className="text-text-muted">·</span>
            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold uppercase">
              {userPlanId}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.sort((a, b) => planOrder.indexOf(a.id) - planOrder.indexOf(b.id)).map((plan) => {
          const isCurrent = userPlanId === plan.id;
          const isPopular = plan.id === "standard";
          const isBest = plan.id === "pro";
          const isTop = plan.id === "max";
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-surface overflow-hidden transition-all ${
                isCurrent
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : isPopular || isBest
                  ? "border-brand-500/40"
                  : "border-border-subtle"
              }`}
            >
              {(isPopular || isBest || isTop) && (
                <div className="absolute top-0 left-0 right-0 px-3 py-1 bg-gradient-to-r from-brand-500 to-purple-500 text-white text-[10px] font-bold uppercase text-center tracking-wider">
                  {isTop ? "Best Value" : isBest ? "Popular" : "Recommended"}
                </div>
              )}

              <div className={`p-5 space-y-4 ${isPopular || isBest || isTop ? "pt-9" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-main">
                    {planIcon(plan.id)}
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-text-main">${plan.discountPrice.toFixed(2)}</span>
                    <span className="text-text-muted text-sm">/ mo</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    <span className="line-through">${plan.price.toFixed(2)}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">12% OFF</span>
                  </div>
                </div>

                <div className="py-3 border-y border-border-subtle">
                  <div className="text-2xl font-bold text-text-main">{plan.creditsText}</div>
                  <div className="text-xs text-text-muted">Credits monthly</div>
                  {plan.multiplierText && (
                    <div className="text-xs text-brand-400 mt-1 font-semibold">{plan.multiplierText}</div>
                  )}
                </div>

                <ul className="space-y-2 text-xs text-text-muted min-h-[180px]">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={14} strokeWidth={2.4} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || subscribingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    isCurrent
                      ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                      : isPopular || isBest || isTop
                      ? "bg-brand-500 hover:bg-brand-500/90 text-white"
                      : "bg-white/5 hover:bg-white/10 text-text-main border border-border-subtle"
                  } disabled:opacity-60`}
                >
                  {subscribingPlan === plan.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Processing...
                    </span>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    "Subscribe"
                  )}
                </button>

                <div className="text-[10px] text-text-muted text-center">
                  Renews at ${plan.price.toFixed(2)}/mo. Cancel anytime.
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-text-muted">
        All plans work with popular coding tools like OpenClaw, Claude Code, OpenCode, and KiloCode.
      </div>
    </div>
  );
}
