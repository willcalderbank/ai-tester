import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Anthropic SDK before importing the handler
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Hello from mock' }],
    usage: { input_tokens: 42, output_tokens: 10 },
  })
  function MockAnthropic() {
    return { messages: { create: mockCreate } }
  }
  return { default: MockAnthropic }
})

// Minimal stubs for Nuxt server utils used in the handler
vi.stubGlobal('defineEventHandler', (fn: Function) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
  const err = new Error(statusMessage) as any
  err.statusCode = statusCode
  return err
})

describe('POST /api/chat', () => {
  let handler: Function

  beforeEach(async () => {
    vi.resetModules()
    handler = (await import('../server/api/chat.post')).default
  })

  it('throws 500 when API key is missing', async () => {
    const original = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    ;(global as any).readBody = vi.fn().mockResolvedValue({ model: 'claude-sonnet-4-5', messages: [] })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 500 })

    process.env.ANTHROPIC_API_KEY = original
  })

  it('throws 500 when API key is placeholder', async () => {
    process.env.ANTHROPIC_API_KEY = 'your_api_key_here'
    ;(global as any).readBody = vi.fn().mockResolvedValue({ model: 'claude-sonnet-4-5', messages: [] })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 500 })
  })

  it('returns content and usage when API key is valid', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    ;(global as any).readBody = vi.fn().mockResolvedValue({
      model: 'claude-sonnet-4-5',
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'Hello' }],
    })

    const result = await handler({})

    expect(result.content).toBe('Hello from mock')
    expect(result.usage.input_tokens).toBe(42)
    expect(result.usage.output_tokens).toBe(10)
  })
})
