import 'server-only';

export const HYDRA_AGENT_ENDPOINTS = {
  basic: process.env.HYDRA_BASIC_URL ?? 'http://localhost:8642',
  mao_template: process.env.HYDRA_MAO_URL ?? 'http://localhost:8643',
  marketing_template: process.env.HYDRA_MARKETING_URL ?? 'http://localhost:8644',
} as const satisfies Record<string, string>;

// In production, API keys MUST be set via environment variables.
// Dev fallbacks below are for local WSL2 development only.
function requireApiKey(envVar: string | undefined, devFallback: string): string {
  if (!envVar) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env var for Hydra Agent API key. Set in Vercel dashboard.`);
    }
    return devFallback;
  }
  return envVar;
}

export const HYDRA_AGENT_API_KEYS = {
  basic: requireApiKey(process.env.HYDRA_BASIC_API_KEY, 'hydra-basic-dev-secret'),
  mao_template: requireApiKey(process.env.HYDRA_MAO_API_KEY, 'hydra-mao-dev-secret'),
  marketing_template: requireApiKey(process.env.HYDRA_MARKETING_API_KEY, 'hydra-marketing-dev-secret'),
} as const satisfies Record<string, string>;
