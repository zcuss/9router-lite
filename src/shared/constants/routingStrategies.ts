export const ROUTING_STRATEGY_VALUES = [
  "failover",
  "round_robin",
  "least_latency",
  "lowest_cost",
  "balanced",
  "auto",
  "priority",
] as const;

export type RoutingStrategy = (typeof ROUTING_STRATEGY_VALUES)[number];
