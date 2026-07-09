'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Trash2, StopCircle, Sparkles, Copy, Check, AlertTriangle, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UserExternalAgent } from '@/lib/types';
import { updateExternalAgent } from '@/lib/api/external-agents';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatTabProps {
  agent: UserExternalAgent;
}

// Helper functions for parsing and cleaning hidden messages
function parseHiddenMessages(text: string): { 
  cleanText: string; 
  selectedModel: string | null;
} {
  const regex = /<!--\s*HIDDEN_MESSAGE:\s*(\{[\s\S]*?\})\s*-->/g;
  let cleanText = text;
  let selectedModel: string | null = null;
  
  cleanText = text.replace(regex, (fullMatch, jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.action === 'update_agent_model' || data.action === 'agent_models_update') {
        selectedModel = data.selected_model || data.current_model || data.model;
      }
    } catch (e) {
      console.error('Failed to parse hidden message JSON:', e);
    }
    return '';
  });
  
  return { cleanText, selectedModel };
}

function cleanStreamingText(text: string): string {
  const partialIndex = text.indexOf('<!--');
  if (partialIndex !== -1) {
    const closeIndex = text.indexOf('-->', partialIndex);
    if (closeIndex === -1) {
      return text.substring(0, partialIndex);
    }
  }
  return text;
}

// Helper function to render text with links (supporting both markdown links [label](url) and plain URLs)
function renderTextWithLinks(text: string) {
  // First split by markdown link: [label](url)
  const mdParts = text.split(/(\[[^\]]+\]\((?:https?:\/\/[^\s)]+)\))/g);
  
  return mdParts.map((mdPart, mdIdx) => {
    const mdMatch = mdPart.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdMatch) {
      const [, label, url] = mdMatch;
      return (
        <a 
          key={`md-link-${mdIdx}`} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline font-medium break-all"
        >
          {label}
        </a>
      );
    }
    
    // Now split by plain URL
    const plainParts = mdPart.split(/(https?:\/\/[^\s<>\(\)\[\]"'`]+)/g);
    return (
      <span key={`plain-text-${mdIdx}`}>
        {plainParts.map((part, partIdx) => {
          if (/^https?:\/\//.test(part)) {
            let url = part;
            let trailing = '';
            const trailingPunctuation = /[.,!?:]+$/;
            const match = part.match(trailingPunctuation);
            if (match) {
              url = part.slice(0, -match[0].length);
              trailing = match[0];
            }
            return (
              <span key={`url-${partIdx}`}>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline font-medium break-all"
                >
                  {url}
                </a>
                {trailing}
              </span>
            );
          }
          return part;
        })}
      </span>
    );
  });
}

// Helper function to render inline markdown-like formatting (bold, code, links)
function renderInlineFormatting(text: string) {
  const subParts = text.split(/(`[^`\n]+`)/g);

  return subParts.map((subPart, subIdx) => {
    if (subPart.startsWith('`') && subPart.endsWith('`')) {
      return (
        <code key={subIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-primary dark:text-zinc-200 font-mono text-xs border border-zinc-200/50 dark:border-zinc-700/50">
          {subPart.slice(1, -1)}
        </code>
      );
    }

    const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={subIdx}>
        {boldParts.map((boldPart, boldIdx) => {
          if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
            return (
              <strong key={boldIdx} className="font-semibold text-foreground">
                {renderTextWithLinks(boldPart.slice(2, -2))}
              </strong>
            );
          }
          return renderTextWithLinks(boldPart);
        })}
      </span>
    );
  });
}

interface TableData {
  type: 'table';
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

// Parses text into segments of plain text and parsed tables
function parseTablesAndText(text: string): (string | TableData)[] {
  const lines = text.split('\n');
  const result: (string | TableData)[] = [];
  
  let currentTableLines: string[] = [];
  let isInsideTable = false;
  let textBuffer: string[] = [];

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      result.push(textBuffer.join('\n'));
      textBuffer = [];
    }
  };

  const isSeparatorRow = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
    const parts = trimmed.slice(1, -1).split('|');
    return parts.length > 0 && parts.every(p => /^[ \t]*:?-+:?[ \t]*$/.test(p));
  };

  const parseTable = (tableLines: string[]) => {
    if (tableLines.length < 3) {
      textBuffer.push(...tableLines);
      return;
    }

    const headerLine = tableLines[0];
    const separatorLine = tableLines[1];
    const dataLines = tableLines.slice(2);

    const sepParts = separatorLine.trim().slice(1, -1).split('|').map(s => s.trim());
    const alignments: ('left' | 'center' | 'right')[] = sepParts.map(part => {
      const start = part.startsWith(':');
      const end = part.endsWith(':');
      if (start && end) return 'center';
      if (end) return 'right';
      return 'left';
    });

    const headers = headerLine.trim().slice(1, -1).split('|').map(s => s.trim());

    const rows = dataLines.map(line => {
      const trimmed = line.trim();
      let parts = trimmed;
      if (trimmed.startsWith('|')) {
        parts = trimmed.slice(1);
      }
      if (trimmed.endsWith('|')) {
        parts = parts.slice(0, -1);
      }
      return parts.split('|').map(s => s.trim());
    });

    flushTextBuffer();
    result.push({
      type: 'table',
      headers,
      alignments,
      rows
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const looksLikeTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');

    if (looksLikeTableRow) {
      if (!isInsideTable) {
        const nextLine = lines[i + 1];
        if (nextLine && isSeparatorRow(nextLine)) {
          flushTextBuffer();
          isInsideTable = true;
          currentTableLines = [line];
        } else {
          textBuffer.push(line);
        }
      } else {
        currentTableLines.push(line);
      }
    } else {
      if (isInsideTable) {
        parseTable(currentTableLines);
        isInsideTable = false;
        currentTableLines = [];
      }
      textBuffer.push(line);
    }
  }

  if (isInsideTable) {
    parseTable(currentTableLines);
  }
  flushTextBuffer();

  return result;
}

// Custom code-block copy button helper
function ChatMessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple and robust parser for rendering markdown-like text
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code Block
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0] || '';
          // Detect language if specified
          const isLanguageDefined = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = isLanguageDefined ? firstLine : '';
          const codeContent = isLanguageDefined ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="my-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                <span>{language || 'code'}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeContent, index)}
                  className="flex items-center gap-1 hover:text-zinc-100 transition-colors p-1 rounded"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-left leading-normal">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // For non-code segments, parse tables and render them appropriately
        const segments = parseTablesAndText(part);

        return (
          <span key={index} className="min-w-0">
            {segments.map((segment, segIdx) => {
              if (typeof segment === 'string') {
                return (
                  <span key={segIdx}>
                    {renderInlineFormatting(segment)}
                  </span>
                );
              }

              // Render Table
              return (
                <div key={segIdx} className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-w-full">
                  <table className="w-full text-left border-collapse text-xs table-auto">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        {segment.headers.map((header, hIdx) => {
                          const alignment = segment.alignments[hIdx] || 'left';
                          return (
                            <th 
                              key={hIdx} 
                              className={cn(
                                "px-4 py-2.5 font-semibold text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 whitespace-nowrap",
                                alignment === 'center' && 'text-center',
                                alignment === 'right' && 'text-right'
                              )}
                            >
                              {renderInlineFormatting(header)}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {segment.rows.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className="border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                        >
                          {row.map((cell, cIdx) => {
                            const alignment = segment.alignments[cIdx] || 'left';
                            return (
                              <td 
                                key={cIdx} 
                                className={cn(
                                  "px-4 py-2.5 text-zinc-600 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 break-words",
                                  alignment === 'center' && 'text-center',
                                  alignment === 'right' && 'text-right'
                                )}
                              >
                                {renderInlineFormatting(cell)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

export default function AgentChatTab({ agent }: AgentChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Clean up abort controller on unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load chat history dynamically on mount and when agent.id changes
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/external-agents/${agent.id}/messages`);
        if (!response.ok) {
          throw new Error('Failed to load chat history');
        }
        const data = await response.json();
        if (isMountedRef.current) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };
    loadChatHistory();
  }, [agent.id]);

  const handleSend = async (textToSend?: string) => {
    const finalInput = textToSend || input;
    if (!finalInput.trim() || isGenerating) return;

    if (!textToSend) {
      setInput('');
    }

    const userMessage: Message = { role: 'user', content: finalInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);
    setError(null);

    // Set up AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/external-agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API 응답 오류가 발생했습니다.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error('응답 스트림을 열 수 없습니다.');
      }

      let assistantContent = '';
      if (isMountedRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      }

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('data:')) {
            const dataStr = cleanLine.slice(cleanLine.indexOf(':') + 1).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                assistantContent += delta;
                if (isMountedRef.current) {
                  setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { role: 'assistant', content: assistantContent };
                    return next;
                  });
                }
              }
            } catch {
              // Ignore incomplete JSON parse errors
            }
          }
        }
      }

      // Process any remaining buffer content
      const cleanBuffer = buffer.trim();
      if (cleanBuffer.startsWith('data:')) {
        const dataStr = cleanBuffer.slice(cleanBuffer.indexOf(':') + 1).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta && isMountedRef.current) {
              assistantContent += delta;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assistantContent };
                return next;
              });
            }
          } catch {
            // Ignore
          }
        }
      }

      // 스트림 완료 후 에이전트 모델 설정 자동 업데이트 체크
      const { selectedModel: detectedModel } = parseHiddenMessages(assistantContent);
      if (detectedModel) {
        try {
          await updateExternalAgent(agent.id, { selected_model: detectedModel });
          window.dispatchEvent(new CustomEvent('agents-updated'));
          setNotification(`에이전트의 활성 모델이 "${detectedModel}"(으)로 자동 업데이트되었습니다.`);
        } catch (e) {
          console.error('Failed to auto update agent model:', e);
        }
      }

    } catch (err: unknown) {
      const errorObject = err as Record<string, unknown> | null;
      if (errorObject && typeof errorObject === 'object' && errorObject.name === 'AbortError') {
        console.log('Generation aborted by user');
      } else {
        console.error('Chat error:', err);
        const errMsg = err instanceof Error ? err.message : '에이전트로부터 응답을 받는 도중 오류가 발생했습니다.';
        if (isMountedRef.current) {
          setError(errMsg);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('대화 기록을 모두 초기화하시겠습니까?')) {
      try {
        const response = await fetch(`/api/external-agents/${agent.id}/messages`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setMessages([]);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || '대화 기록을 초기화하는 중 오류가 발생했습니다.');
        }
      } catch (err) {
        console.error('Error clearing chat history:', err);
        setError('대화 기록을 초기화하는 중 오류가 발생했습니다.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const starterPrompts = [
    { text: '현재 시스템 상태 검사', prompt: '현재 너의 에이전트 인스턴스 정보와 구동 환경 상태가 어떤지 요약해서 알려줘.' },
    { text: '할 일 목록 정리', prompt: '마케팅 기획을 위한 분석 및 작업 플랜 목록을 간결한 테이블 형태로 작성해줘.' },
    { text: '간단한 인사', prompt: '안녕하세요! 당신이 누구인지, 그리고 어떤 역할을 도와줄 수 있는지 간략히 소개해 주세요.' }
  ];

  return (
    <Card className="flex flex-col h-[calc(100vh-270px)] min-h-[550px] max-h-[750px] border border-border/70 shadow-lg rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
      {/* Chat Tab Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-4 px-6 border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            "text-xs px-2.5 py-0.5 font-semibold transition-colors duration-300",
            agent.status === 'online' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
          )}>
            {agent.status === 'online' ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        {messages.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearChat}
            disabled={isGenerating}
            className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 transition-all"
          >
            <Trash2 className="size-3.5" />
            <span className="text-xs">대화 비우기</span>
          </Button>
        )}
      </CardHeader>

      {notification && (
        <div className="mx-6 mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between text-xs font-medium animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500 animate-pulse" />
            <span>{notification}</span>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 transition-colors p-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Chat Messages Panel */}
      <CardContent className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
              <div className="relative size-16 bg-gradient-to-tr from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <Bot className="size-9 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">{agent.name}와 대화 시작</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                로컬 또는 원격 인스턴스에 안전하게 연결되었습니다. 대화를 시작해 업무를 지시하거나 AI Agent의 상태를 확인해 보세요.
              </p>
            </div>

            <div className="grid gap-3 w-full pt-4">
              <span className="text-xs font-semibold text-zinc-400 text-left px-1 uppercase tracking-wider">추천 대화 시작하기</span>
              {starterPrompts.map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(starter.prompt)}
                  className="flex items-center justify-between text-left p-3.5 rounded-xl border border-border/80 bg-white/70 dark:bg-zinc-900/60 hover:bg-primary/5 hover:border-primary/30 hover:text-primary dark:hover:bg-primary/10 transition-all duration-200 text-xs font-medium text-muted-foreground group"
                >
                  <span>{starter.text}</span>
                  <Sparkles className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div 
                  key={index} 
                  className={cn(
                    "flex gap-4 items-start animate-fade-in transition-all",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className={cn(
                    "size-9 shrink-0 flex items-center justify-center border shadow-sm",
                    isUser 
                      ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300" 
                      : "bg-gradient-to-tr from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 border-primary/20 text-primary"
                  )}>
                    {isUser ? <User className="size-4" /> : <Bot className="size-5" />}
                  </Avatar>

                  <div className={cn(
                    "flex flex-col max-w-[80%]",
                    isUser ? "items-end" : "items-start"
                  )}>
                    <span className="text-[10px] text-muted-foreground font-semibold mb-1 px-1 tracking-wide uppercase">
                      {isUser ? 'User' : agent.name}
                    </span>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed border",
                      isUser 
                        ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none" 
                        : "bg-white/80 dark:bg-zinc-900/80 border-border/80 text-foreground rounded-tl-none"
                    )}>
                      {(() => {
                        const isLastMessage = index === messages.length - 1;
                        const rawContent = message.content;
                        const streamingCleaned = isLastMessage && isGenerating ? cleanStreamingText(rawContent) : rawContent;
                        const { cleanText } = parseHiddenMessages(streamingCleaned);

                        if (isUser) {
                          return <p className="whitespace-pre-wrap break-words">{cleanText}</p>;
                        }

                        if (message.content === '' && isGenerating && isLastMessage) {
                          return (
                            <div className="flex items-center gap-1 py-1 px-1">
                              <span className="size-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="size-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="size-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          );
                        }

                        return <ChatMessageContent content={cleanText} />;
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-4 text-center max-w-md mx-auto space-y-2 shadow-sm animate-fade-in">
                <p className="text-xs text-destructive font-semibold flex items-center justify-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  응답 수신 오류
                </p>
                <p className="text-xs text-muted-foreground leading-normal">{error}</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Input panel */}
      <CardFooter className="px-6 pt-6 border-t border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-3">
        {isGenerating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStop}
            className="mx-auto rounded-full border-border/80 bg-white dark:bg-zinc-950 text-xs px-4 py-1.5 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-rose-600 hover:border-rose-200/50 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <StopCircle className="size-4 text-rose-500" />
            답변 생성 중단
          </Button>
        )}

        <div className="flex items-end gap-2 w-full relative">
          <Textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={agent.status === 'online' ? "에이전트에게 전할 메시지를 입력하세요... (Enter로 전송)" : "에이전트가 오프라인 상태입니다."}
            disabled={agent.status !== 'online' || isGenerating}
            className="flex-1 min-h-[48px] max-h-[160px] py-3.5 px-4 pr-12 rounded-xl bg-white dark:bg-zinc-900 border border-border/80 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 resize-none shadow-inner text-sm transition-all"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => handleSend()}
            disabled={agent.status !== 'online' || isGenerating || !input.trim()}
            className="absolute right-2.5 bottom-2.5 size-8 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow active:scale-95 transition-all duration-150"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
