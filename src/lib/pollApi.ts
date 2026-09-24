import { supabase } from '@/lib/supabase';
import type { PollOption } from '@/lib/types';

export interface PollResults {
  total: number;
  a: { votes: number; percent: number };
  b: { votes: number; percent: number };
  c: { votes: number; percent: number };
}

export type PollErrorCode =
  | 'invalid_email'
  | 'invalid_request'
  | 'not_subscribed'
  | 'poll_closed'
  | 'already_voted'
  | 'rate_limited'
  | 'internal_error';

export class PollApiError extends Error {
  code: PollErrorCode;
  constructor(code: PollErrorCode) {
    super(code);
    this.code = code;
  }
}

// Toda la lógica (suscripción, validación del voto, rate limit) vive en la
// Edge Function poll-actions; el cliente solo la invoca y muestra el resultado.
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('poll-actions', { body });
  if (error) {
    let code: PollErrorCode = 'internal_error';
    try {
      const parsed = await (error as { context?: Response }).context?.json();
      if (parsed?.error) code = parsed.error as PollErrorCode;
    } catch {
      /* respuesta sin JSON: se queda internal_error */
    }
    throw new PollApiError(code);
  }
  return data as T;
}

export const pollApi = {
  subscribe: (email: string) => call<{ subscribed: boolean }>({ action: 'subscribe', email }),
  checkSubscribed: (email: string) => call<{ subscribed: boolean }>({ action: 'check_subscribed', email }),
  hasVoted: (pollId: string, email: string) =>
    call<{ voted: boolean }>({ action: 'has_voted', poll_id: pollId, email }),
  vote: (pollId: string, email: string, option: PollOption) =>
    call<{ voted: boolean; results: PollResults }>({ action: 'vote', poll_id: pollId, email, option }),
  results: (pollId: string) => call<PollResults>({ action: 'results', poll_id: pollId }),
};
