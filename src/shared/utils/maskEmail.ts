export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const maskedLocal = local.length <= 2 ? local : local[0] + '*'.repeat(local.length - 2) + local.slice(-1);
  return `${maskedLocal}@${domain}`;
}

export function pickDisplayValue(values: Array<string | null | undefined>, visible: boolean, fallback = "") {
  const value = values.find((item) => typeof item === "string" && item.trim()) || fallback;
  if (visible) return value;
  return value.includes("@") ? maskEmail(value) : value;
}
