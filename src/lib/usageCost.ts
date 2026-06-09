export type UsageInput = {
  userId: string;
  role: string;
  comboId?: string | null;
  comboStep?: number;
  connectionId?: string | null;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  statusCode: number;
  errorMessage?: string | null;
  priceInPerMillion?: number;
  priceOutPerMillion?: number;
};

export function calculateCost(promptTokens = 0, completionTokens = 0, priceInPerMillion = 0, priceOutPerMillion = 0) {
  const costIn = (promptTokens * priceInPerMillion) / 1_000_000;
  const costOut = (completionTokens * priceOutPerMillion) / 1_000_000;
  return { costIn, costOut, totalCost: costIn + costOut };
}

export async function recordUsage(input: UsageInput) {
  const { getAdapter } = await import("./db/driver.js");
  const db = await getAdapter();
  const prompt = input.promptTokens || 0;
  const completion = input.completionTokens || 0;
  const total = prompt + completion;
  const cost = calculateCost(prompt, completion, input.priceInPerMillion || 0, input.priceOutPerMillion || 0);
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO usage_logs (
      id, user_id, role, combo_id, combo_step, connection_id, provider, model,
      prompt_tokens, completion_tokens, total_tokens, cost_in, cost_out, total_cost,
      latency_ms, status_code, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.userId,
      input.role,
      input.comboId || null,
      input.comboStep || 0,
      input.connectionId || null,
      input.provider,
      input.model,
      prompt,
      completion,
      total,
      cost.costIn,
      cost.costOut,
      cost.totalCost,
      input.latencyMs,
      input.statusCode,
      input.errorMessage || null,
      now,
    ]
  );

  return { totalTokens: total, ...cost };
}
