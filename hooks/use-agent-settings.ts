'use client';

import { useState, useEffect } from 'react';

const TOKENS_STORAGE_KEY = 'open-tutorials-agent-max-tokens';
const THRESHOLD_STORAGE_KEY = 'open-tutorials-agent-compression-threshold';
const DEFAULT_MAX_TOKENS = '16k';
const DEFAULT_THRESHOLD = 80;

export function useAgentSettings() {
  const [maxTokens, setMaxTokensState] = useState<string>(DEFAULT_MAX_TOKENS);
  const [compressionThreshold, setCompressionThresholdState] = useState<number>(DEFAULT_THRESHOLD);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
    if (savedTokens) {
      setMaxTokensState(savedTokens);
    }
    const savedThreshold = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (savedThreshold) {
      const parsed = parseInt(savedThreshold, 10);
      if (!isNaN(parsed) && parsed >= 50 && parsed <= 80) {
        setCompressionThresholdState(parsed);
      }
    }
    setIsMounted(true);
  }, []);

  const setMaxTokens = (value: string) => {
    setMaxTokensState(value);
    localStorage.setItem(TOKENS_STORAGE_KEY, value);
  };

  const setCompressionThreshold = (value: number) => {
    setCompressionThresholdState(value);
    localStorage.setItem(THRESHOLD_STORAGE_KEY, value.toString());
  };

  return {
    maxTokens: isMounted ? maxTokens : DEFAULT_MAX_TOKENS,
    setMaxTokens,
    compressionThreshold: isMounted ? compressionThreshold : DEFAULT_THRESHOLD,
    setCompressionThreshold,
    isMounted,
  };
}
