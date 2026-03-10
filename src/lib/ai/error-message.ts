export function formatAiErrorMessage(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? 'Unknown AI provider error');

  const message = raw.trim();
  const lower = message.toLowerCase();

  if (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'This provider hit a quota or rate limit. Check billing/usage, wait a moment, or try a smaller model.';
  }

  if (
    lower.includes('api key') ||
    lower.includes('unauthorized') ||
    lower.includes('authentication') ||
    lower.includes('invalid key') ||
    lower.includes('permission denied') ||
    lower.includes('401')
  ) {
    return 'Provider authentication failed. Check the API key for this provider in `.env.local`.';
  }

  if (
    lower.includes('model') &&
    (lower.includes('not found') ||
      lower.includes('unsupported') ||
      lower.includes('not available') ||
      lower.includes('does not exist'))
  ) {
    return 'This model is not available for your current provider account or SDK configuration.';
  }

  if (lower.includes('no body')) {
    return 'The provider returned an empty response. Please try again.';
  }

  if (lower.includes('network') || lower.includes('fetch failed')) {
    return 'The request failed due to a network issue. Please try again.';
  }

  return message.split('\n')[0] || 'Something went wrong while talking to the AI provider.';
}

export async function getApiErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.error === 'string') {
      return data.error;
    }
    return formatAiErrorMessage(data?.error ?? data);
  } catch {
    try {
      const text = await response.text();
      return formatAiErrorMessage(text);
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }
}
