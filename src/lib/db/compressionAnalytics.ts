export function getCompressionAnalytics() {
  return {
    getSummary: async (since?: string) => ({
      totalRequests: 0,
      totalOriginalTokens: 0,
      totalSavedTokens: 0,
      averageRatio: 0,
      byStrategy: [],
      byModel: [],
    }),
    getHistory: async () => [],
  };
}

export async function getCompressionAnalyticsSummary(since?: string) {
  return {
    totalRequests: 0,
    totalOriginalTokens: 0,
    totalSavedTokens: 0,
    averageRatio: 0,
    byStrategy: [],
    byModel: [],
  };
}
