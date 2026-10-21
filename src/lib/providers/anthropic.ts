import Anthropic from '@anthropic-ai/sdk';
import type { ChatProvider } from '../types';

export class RefusalError extends Error {}

/**
 * Streams a reply from the Claude API straight from the browser.
 * The key belongs to the visitor (bring-your-own-key) and never leaves their machine
 * except in the request to api.anthropic.com. A production app would proxy this call
 * through its own backend instead.
 */
export function anthropicProvider(apiKey: string, model: string): ChatProvider {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return async function* ({ system, messages, signal }) {
    const stream = client.messages.stream(
      { model, max_tokens: 16000, system, messages },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      throw new RefusalError('The model declined to answer this request.');
    }
  };
}

/** Turns SDK errors into a short message a user can act on. */
export function describeError(err: unknown): string {
  if (err instanceof RefusalError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return 'The API key was rejected. Check it in Settings.';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limit reached. Wait a moment and try again.';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the API. Check your connection.';
  if (err instanceof Anthropic.APIError) return `API error ${err.status ?? ''}: ${err.message}`.trim();
  return err instanceof Error ? err.message : 'Something went wrong.';
}
