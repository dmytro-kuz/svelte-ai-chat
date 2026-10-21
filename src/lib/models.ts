export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Most capable' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Balanced' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Fastest' },
] as const;

export const DEFAULT_MODEL = MODELS[0].id;
