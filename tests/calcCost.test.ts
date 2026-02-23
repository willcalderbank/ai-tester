import { describe, it, expect } from 'vitest'
import { calcCost, MODELS } from '../app/composables/useChat'

describe('MODELS', () => {
  it('has at least one model', () => {
    expect(MODELS.length).toBeGreaterThan(0)
  })

  it('each model has required fields with positive pricing', () => {
    for (const model of MODELS) {
      expect(model.id).toBeTruthy()
      expect(model.label).toBeTruthy()
      expect(model.inputPer1M).toBeGreaterThan(0)
      expect(model.outputPer1M).toBeGreaterThan(0)
      // output should always cost more than input
      expect(model.outputPer1M).toBeGreaterThan(model.inputPer1M)
    }
  })
})

describe('calcCost', () => {
  it('returns 0 for zero tokens', () => {
    expect(calcCost(0, 0, MODELS[0].id)).toBe(0)
  })

  it('calculates input-only cost correctly for sonnet', () => {
    // 1M input tokens at $3.00/M = $3.00
    expect(calcCost(1_000_000, 0, 'claude-sonnet-4-5')).toBeCloseTo(3.0)
  })

  it('calculates output-only cost correctly for sonnet', () => {
    // 1M output tokens at $15.00/M = $15.00
    expect(calcCost(0, 1_000_000, 'claude-sonnet-4-5')).toBeCloseTo(15.0)
  })

  it('calculates combined cost correctly for haiku', () => {
    // 500k input @ $0.80/M + 500k output @ $4.00/M = $0.40 + $2.00 = $2.40
    expect(calcCost(500_000, 500_000, 'claude-haiku-4-5')).toBeCloseTo(2.4)
  })

  it('calculates a realistic small request (~200 tokens total)', () => {
    // 100 input + 100 output on sonnet: (100/1M)*3 + (100/1M)*15 = $0.0003 + $0.0015 = $0.0018
    const cost = calcCost(100, 100, 'claude-sonnet-4-5')
    expect(cost).toBeCloseTo(0.0018, 6)
  })

  it('falls back to first model for unknown model id', () => {
    const costWithFallback = calcCost(1_000_000, 0, 'unknown-model')
    const costWithFirst = calcCost(1_000_000, 0, MODELS[0].id)
    expect(costWithFallback).toBe(costWithFirst)
  })

  it('opus costs more than haiku for same tokens', () => {
    const haiku = calcCost(10_000, 10_000, 'claude-haiku-4-5')
    const opus = calcCost(10_000, 10_000, 'claude-opus-4-5')
    expect(opus).toBeGreaterThan(haiku)
  })
})
