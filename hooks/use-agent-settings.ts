'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'open-tutorials-agent-max-tokens';
const DEFAULT_MAX_TOKENS = '16k';

export function useAgentSettings() {
  const [maxTokens, setMaxTokensState] = useState<string>(DEFAULT_MAX_TOKENS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setMaxTokensState(saved);
    }
    setIsMounted(true);
  }, []);

  const setMaxTokens = (value: string) => {
    setMaxTokensState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return {
    maxTokens: isMounted ? maxTokens : DEFAULT_MAX_TOKENS,
    setMaxTokens,
    isMounted,
  };
}
