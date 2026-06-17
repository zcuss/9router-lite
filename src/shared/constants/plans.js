export const PLANS = {
  lite: {
    id: "lite",
    name: "Lite",
    price: 6.00,
    discountPrice: 5.28,
    credits: 4100000000, // 4.1 Billion Credits
    creditsText: "4.1 Billion",
    multiplierText: "Starter Pack",
    desc: "Access to standard base models.",
    allowedModels: [
      "mimo-v2.5",
      "mimo-v2.5-asr",
      "mimo-v2.5-tts",
    ],
    features: [
      "Access to base models (mimo-v2.5, asr, tts)",
      "4,100,000,000 Credits monthly package total",
      "Works with popular coding tools (OpenClaw, Claude Code, OpenCode, KiloCode)",
      "20% off during off-peak hours (9:00 AM-5:00 PM PDT)",
      "Free access to TTS models for a limited time",
    ]
  },
  standard: {
    id: "standard",
    name: "Standard",
    price: 16.00,
    discountPrice: 14.08,
    credits: 11000000000, // 11 Billion Credits
    creditsText: "11 Billion",
    multiplierText: "2.7x Lite Usage",
    desc: "For advanced users needing extra credits.",
    allowedModels: [
      "mimo-v2.5",
      "mimo-v2.5-asr",
      "mimo-v2.5-tts",
    ],
    features: [
      "Access to base models (mimo-v2.5, asr, tts)",
      "11,000,000,000 Credits monthly package total",
      "2.7x Lite Usage",
      "Works with popular coding tools (OpenClaw, Claude Code, OpenCode, KiloCode)",
      "20% off during off-peak hours (9:00 AM-5:00 PM PDT)",
      "Free access to TTS models for a limited time",
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 50.00,
    discountPrice: 44.00,
    credits: 38000000000, // 38 Billion Credits
    creditsText: "38 Billion",
    multiplierText: "9.3x Lite Usage",
    desc: "Access to all models, optimized for professionals.",
    allowedModels: null, // null = all models
    features: [
      "Access to all 9 models, including flagship mimo-v2.5-pro, base, asr, tts, tts-voiceclone, tts-voicedesign, plus full V2 series",
      "38,000,000,000 Credits monthly package total",
      "9.3x Lite Usage",
      "Works with popular coding tools (OpenClaw, Claude Code, OpenCode, KiloCode)",
      "20% off during off-peak hours (9:00 AM-5:00 PM PDT)",
      "Free access to TTS models for a limited time",
    ]
  },
  max: {
    id: "max",
    name: "Max",
    price: 100.00,
    discountPrice: 88.00,
    credits: 82000000000, // 82 Billion Credits
    creditsText: "82 Billion",
    multiplierText: "20x Lite Usage",
    desc: "Maximum allowance for coding enthusiasts.",
    allowedModels: null, // null = all models
    features: [
      "Access to all 9 models, including flagship mimo-v2.5-pro, base, asr, tts, tts-voiceclone, tts-voicedesign, plus full V2 series",
      "82,000,000,000 Credits monthly package total",
      "20x Lite Usage",
      "Works with popular coding tools (OpenClaw, Claude Code, OpenCode, KiloCode)",
      "20% off during off-peak hours (9:00 AM-5:00 PM PDT)",
      "Free access to TTS models for a limited time",
    ]
  }
};

export const PLANS_LIST = [PLANS.lite, PLANS.standard, PLANS.pro, PLANS.max];
