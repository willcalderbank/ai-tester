export interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string | any[]
  imageUrl?: string
  inputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  outputTokens?: number
  model?: string
}

export interface Model {
  id: string
  label: string
  provider: 'anthropic' | 'openai'
  inputPer1M: number
  outputPer1M: number
  cacheCreationPer1M?: number
  cacheCreation1hPer1M?: number
  cacheReadPer1M?: number
  supportsCompaction?: boolean
}

export const MODELS: Model[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic', inputPer1M: 5.0, cacheCreationPer1M: 6.25, cacheCreation1hPer1M: 10.0, cacheReadPer1M: 0.50, outputPer1M: 25.0, supportsCompaction: true },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', inputPer1M: 3.0, cacheCreationPer1M: 3.75, cacheCreation1hPer1M: 6.0, cacheReadPer1M: 0.30, outputPer1M: 15.0, supportsCompaction: true },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', inputPer1M: 3.0, cacheCreationPer1M: 3.75, cacheCreation1hPer1M: 6.0, cacheReadPer1M: 0.30, outputPer1M: 15.0 },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', inputPer1M: 1.0, cacheCreationPer1M: 1.25, cacheCreation1hPer1M: 2.0, cacheReadPer1M: 0.10, outputPer1M: 5.0 },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', inputPer1M: 5.0, cacheCreationPer1M: 6.25, cacheCreation1hPer1M: 10.0, cacheReadPer1M: 0.50, outputPer1M: 25.0 },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', inputPer1M: 2.5, outputPer1M: 10.0 },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', inputPer1M: 0.15, outputPer1M: 0.6 },
  { id: 'o3-mini', label: 'o3 Mini', provider: 'openai', inputPer1M: 1.1, outputPer1M: 4.4 },
]

export function calcCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
  cacheTTL: '5min' | '1h' = '5min'
): number {
  const model = MODELS.find((m) => m.id === modelId) || MODELS[0]!
  const inputCost = (inputTokens / 1_000_000) * model.inputPer1M
  const cacheCreationPrice = cacheTTL === '1h' ? model.cacheCreation1hPer1M : model.cacheCreationPer1M
  const cacheCreationCost = (cacheCreationTokens / 1_000_000) * (cacheCreationPrice ?? model.inputPer1M)
  const cacheReadCost = (cacheReadTokens / 1_000_000) * (model.cacheReadPer1M ?? 0)
  const outputCost = (outputTokens / 1_000_000) * model.outputPer1M
  return inputCost + cacheCreationCost + cacheReadCost + outputCost
}
