import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { model, system, messages } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY not configured in .env' })
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: system || undefined,
    messages,
  })

  return {
    content: response.content[0].type === 'text' ? response.content[0].text : '',
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
})
