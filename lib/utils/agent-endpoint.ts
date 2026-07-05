/**
 * Normalizes the agent endpoint URL.
 * Replaces localhost with 127.0.0.1, removes trailing slash, and returns both baseUrl and v1Url.
 */
export function normalizeAgentEndpoint(endpoint: string) {
  if (!endpoint) {
    return {
      baseUrl: '',
      v1Url: '',
    };
  }

  const resolvedEndpoint = endpoint.replace('//localhost', '//127.0.0.1');
  const cleanEndpoint = resolvedEndpoint.replace(/\/$/, '');

  const baseUrl = cleanEndpoint.endsWith('/v1')
    ? cleanEndpoint.substring(0, cleanEndpoint.length - 3)
    : cleanEndpoint;

  const v1Url = cleanEndpoint.endsWith('/v1')
    ? cleanEndpoint
    : `${cleanEndpoint}/v1`;

  return {
    baseUrl,
    v1Url,
  };
}
