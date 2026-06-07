import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export const aiEnabled = (): boolean => Boolean(env.OPENAI_API_KEY);

/**
 * Runs a chat completion and returns the text. When no API key is configured,
 * returns a deterministic heuristic fallback so the platform stays usable in
 * local/dev/test without external dependencies.
 */
export async function complete(
  system: string,
  user: string,
  fallback: () => string,
): Promise<{ content: string; model: string; source: 'openai' | 'fallback' }> {
  const openai = getOpenAIClient();
  if (!openai) {
    return { content: fallback(), model: 'heuristic', source: 'fallback' };
  }
  try {
    const res = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return {
      content: res.choices[0]?.message?.content ?? fallback(),
      model: env.OPENAI_MODEL,
      source: 'openai',
    };
  } catch (err) {
    logger.error({ err }, 'OpenAI request failed; using fallback');
    return { content: fallback(), model: 'heuristic', source: 'fallback' };
  }
}
