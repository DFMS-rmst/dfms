import { env } from '../../config/env.js';
import { AppError } from '../../common/errors.js';

export class OpenAiCompatibleProvider {
  async answer({ messages }) {
    if (!env.LLM_API_KEY)
      throw new AppError(
        503,
        'LLM_NOT_CONFIGURED',
        'Smart Advisor is unavailable because no LLM provider key is configured',
      );
    let response;
    try {
      response = await fetch(`${env.LLM_API_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.LLM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.LLM_MODEL, temperature: 0, messages }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new AppError(503, 'LLM_UNAVAILABLE', 'Smart Advisor provider is unavailable');
    }
    if (!response.ok)
      throw new AppError(503, 'LLM_UNAVAILABLE', 'Smart Advisor provider rejected the request');
    const body = await response.json();
    const content = body.choices?.[0]?.message?.content;
    if (!content)
      throw new AppError(503, 'LLM_INVALID_RESPONSE', 'Smart Advisor returned no answer');
    return content;
  }
}

export const llmProvider = new OpenAiCompatibleProvider();
