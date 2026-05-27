import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline'
import { environment } from '../src/environment'
import { createSession } from '../src/agent/create-session'
import { chatSystemPrompt } from '../src/agent/prompts/chat'
import { queryTools } from '../src/agent/tools'

if (!environment.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required')
}

const session = createSession(
  new Anthropic({ apiKey: environment.ANTHROPIC_API_KEY }),
  chatSystemPrompt(false),
  queryTools,
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('tf2pickup agent (CLI mode). Type "exit" to quit.\n')

const prompt = (): void => {
  rl.question('You: ', input => {
    const question = input.trim()
    if (!question || question === 'exit' || question === 'quit') {
      rl.close()
      process.exit(0)
    }

    session
      .ask(question)
      .then(({ answer }) => {
        console.log(`\nAgent: ${answer}\n`)
        prompt()
      })
      .catch((err: unknown) => {
        console.error('Error:', err)
        prompt()
      })
  })
}

prompt()
