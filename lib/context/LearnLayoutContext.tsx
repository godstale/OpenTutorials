'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type LearnLayoutType = '3-layout' | 'toc-content' | 'content-tutor' | 'content-only';

interface LearnLayoutContextType {
  layout: LearnLayoutType;
  setLayout: (layout: LearnLayoutType) => void;
}

const LearnLayoutContext = createContext<LearnLayoutContextType | undefined>(undefined);

export function LearnLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayout] = useState<LearnLayoutType>('3-layout');

  // Load layout preference from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('open-tutorials-learn-layout') as LearnLayoutType;
    if (savedLayout && ['3-layout', 'toc-content', 'content-tutor', 'content-only'].includes(savedLayout)) {
      setLayout(savedLayout);
    }
  }, []);

  const handleSetLayout = (newLayout: LearnLayoutType) => {
    setLayout(newLayout);
    localStorage.setItem('open-tutorials-learn-layout', newLayout);
  };

  return (
    <LearnLayoutContext.Provider value={{ layout, setLayout: handleSetLayout }}>
      {children}
    </LearnLayoutContext.Provider>
  );
}

export function useLearnLayout() {
  const context = useContext(LearnLayoutContext);
  if (context === undefined) {
    return {
      layout: '3-layout' as LearnLayoutType,
      setLayout: () => {},
    };
  }
  return context;
}
