import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  const { model, system } = await readBody(event)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey })
  const result = await (client.messages as any).countTokens({
    model,
    system,
    messages: [{ role: 'user', content: '.' }],
  })

  return { inputTokens: result.input_tokens }
})
