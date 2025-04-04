export const MINA_PREFIXES = {
  event: "MinaZkappEvent******",
  events: "MinaZkappEvents*****",
  sequenceEvents: "MinaZkappSeqEvents**",
} as const;

export const MINA_SALTS = {
  empty_actions: "MinaZkappActionsEmpty",
  empty_events: "MinaZkappEventsEmpty",
};
