'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Send, Bot, User, Captions, X, Copy, Check, Loader2, Lock, BookOpen, ChevronDown, CheckCircle2, Trash2 } from 'lucide-react';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { Course, TocNode, CoursePackage } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { updateExternalAgent } from '@/lib/api/external-agents';
import { useSidebar } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn, agentLeaveTimers } from '@/lib/utils';
import { useAgentSettings } from '@/hooks/use-agent-settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { useLearnLayout } from '@/lib/context/LearnLayoutContext';

// react-player renders custom elements (e.g. <youtube-video>) that reference `document` at module load time, so it must be client-only.
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface ChatMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  timestamp?: string;
}

interface LearnPageClientProps {
  slug: string;
  course: Course;
  cards: Array<{
    filename?: string;
    title: string;
    mdxSource?: MDXRemoteSerializeResult;
    content?: string;
    type?: 'video';
    videoInfo?: {
      provider: string;
      video_id: string;
      duration_seconds?: number;
      subtitles?: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    };
  }>;
  initialCardIndex?: number;
  isUpdated?: boolean;
  userProgress?: {
    last_card: number;
    max_card?: number;
    completed: boolean;
  } | null;
  checkpoints?: Array<{
    afterCard: string;
    prompt: string;
  }>;
  coursePackage?: CoursePackage | null;
}

// Helper function to find a TOC node by its filename
function findTocNodeByFilename(nodes: TocNode[], filename: string): TocNode | null {
  for (const node of nodes) {
    if (node.filename === filename) return node;
    if (node.children && node.children.length > 0) {
      const found = findTocNodeByFilename(node.children, filename);
      if (found) return found;
    }
  }
  return null;
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
        <code key={subIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-primary dark:text-zinc-200 font-mono text-xs border border-zinc-200/50 dark:border-zinc-700/50 break-words">
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

// Custom code-block copy button helper for AI Tutor replies
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
    <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0">
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
            <div key={index} className="my-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm font-mono text-xs max-w-full">
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
                      <span className="text-emerald-500 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-left leading-normal max-w-full">
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

// Helper functions for parsing and cleaning hidden messages
function parseHiddenMessages(text: string): { 
  cleanText: string; 
  downloaded: boolean | null; 
  checkpointPassed: boolean | null; 
} {
  const regex = /<!--\s*HIDDEN_MESSAGE:\s*(\{[\s\S]*?\})\s*-->/g;
  let cleanText = text;
  let downloaded: boolean | null = null;
  let checkpointPassed: boolean | null = null;
  
  cleanText = text.replace(regex, (fullMatch, jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.action === 'download_status') {
        downloaded = data.downloaded;
      } else if (data.action === 'checkpoint_evaluation') {
        checkpointPassed = data.passed;
      }
    } catch (e) {
      console.error('Failed to parse hidden message JSON:', e);
    }
    return '';
  });
  
  return { cleanText, downloaded, checkpointPassed };
}

function getLeafNodes(nodes: TocNode[], list: TocNode[] = []): TocNode[] {
  for (const node of nodes) {
    if (node.filename) {
      list.push(node);
    }
    if (node.children) {
      getLeafNodes(node.children, list);
    }
  }
  return list;
}

function isAncestorOfActiveCard(
  node: TocNode,
  activeCardIndex: number,
  nodeToIndexMap: Map<TocNode, number>
): boolean {
  if (node.filename) {
    return nodeToIndexMap.get(node) === activeCardIndex;
  }
  if (node.children) {
    for (const child of node.children) {
      if (isAncestorOfActiveCard(child, activeCardIndex, nodeToIndexMap)) {
        return true;
      }
    }
  }
  return false;
}

function generateFallbackTocText(nodes: TocNode[], depth: number = 0): string {
  let text = '';
  const indent = '  '.repeat(depth);
  nodes.forEach((node) => {
    text += `${indent}- [${node.type.toUpperCase()}] ${node.title}\n`;
    if (node.description) {
      text += `${indent}  Description: ${node.description}\n`;
    }
    if (node.filename) {
      text += `${indent}  File: ${node.filename}\n`;
    }
    if (node.children && node.children.length > 0) {
      text += generateFallbackTocText(node.children, depth + 1);
    }
  });
  return text;
}

function buildSystemPrompt({
  course,
  coursePackage,
  cards,
  currentCardIndex,
  wikiContent,
  agentType,
  isCheckpointMode,
  activeCheckpoint,
  isFallback,
  isFirstQuestion,
  finalResourceUrl,
}: {
  course: Course;
  coursePackage?: CoursePackage | null;
  cards: any[];
  currentCardIndex: number;
  wikiContent: string;
  agentType: string;
  isCheckpointMode: boolean;
  activeCheckpoint: any;
  isFallback: boolean;
  isFirstQuestion: boolean;
  finalResourceUrl: string;
}) {
  const currentCard = cards[currentCardIndex];
  let cardContent = currentCard?.content || '';
  
  if (currentCard?.type === 'video' && currentCard?.videoInfo?.subtitles) {
    const subtitleTexts = currentCard.videoInfo.subtitles.map(
      (sub: { start: number; end: number; text: string }) => `[${Math.floor(sub.start / 60)}:${String(Math.floor(sub.start % 60)).padStart(2, '0')}] ${sub.text}`
    );
    cardContent = `이 카드는 동영상 강의입니다. 아래는 동영상의 자막 스크립트 내용입니다:\n---\n${subtitleTexts.join('\n')}\n---`;
  }

  let currentUnitContext = '';
  if (course.toc && currentCard?.filename) {
    const activeNode = findTocNodeByFilename(course.toc, currentCard.filename);
    if (activeNode) {
      currentUnitContext = `[Current Unit Details]\nUnit Title: ${activeNode.title}\nUnit Objective/Description: ${activeNode.description || 'No description available.'}`;
    }
  }

  const targetAge = coursePackage?.target_age || '전연령';
  const category = coursePackage?.category || 'General';
  const tags = coursePackage?.tags?.join(', ') || 'None';
  const totalCards = cards.length;

  let systemPrompt = '';
  if (agentType === 'llm') {
    systemPrompt = `You are a helpful AI tutor for the course "${course.title}".
Use the following information to answer the student's question and guide them through their learning.

[Course Info]
Title: ${course.title}
Description: ${course.description || 'No description available.'}
Category: ${category}
Target Audience: ${targetAge}
Tags: ${tags}

[Learning Progress & Context]
Progress: Card ${currentCardIndex + 1} of ${totalCards} (${Math.round(((currentCardIndex + 1) / totalCards) * 100)}% completed)
${currentUnitContext}

[Current Card Content]
Title: ${currentCard?.title || 'Untitled'}
Content:
${cardContent}

${wikiContent ? `[Relevant Course Wiki & Resources]\n${wikiContent}\n` : ''}

[Instruction for AI Tutor]
- Adapt your explanation depth, vocabulary complexity, and tone to suit the target audience: "${targetAge}". (e.g., use friendly, simple, and visual analogies for children/teens, and structured, professional context for adults.)
- Guide the student step-by-step using the context above.
- Keep your answer clear, informative, and formatted in markdown.`;

    if (isCheckpointMode && activeCheckpoint) {
      systemPrompt += `

[Active Checkpoint QnA Evaluation]
The student is currently undergoing a checkpoint QnA for the card "${currentCard?.title || 'Untitled'}".
The evaluation instruction is:
"${activeCheckpoint.prompt}"

You must evaluate the student's response.
If the student's response satisfies the criteria, respond with praise and details, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": true} -->

If the student's response does NOT satisfy the criteria, explain why and encourage them to try again, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": false} -->`;
    }
  } else {
    let fallbackTocText = '';
    if (isFallback && isFirstQuestion) {
      const tocItems = course.toc || [];
      const tocTreeText = generateFallbackTocText(tocItems, 0);
      fallbackTocText = `\n\n[Fallback Course Table of Contents]\n${tocTreeText}\n\nNote: The resource URL could not be loaded via external storage. Please refer to this Table of Contents to understand the overall course structure.`;
    }

    systemPrompt = `You are a helpful AI tutor for the course "${course.title}". 
To minimize context payload, detailed course contents (summaries, chapters, and all card contents) are not sent directly in the chat messages.
Instead, you must download the complete course materials from the following URL into a course-specific directory in your workspace (e.g. "courses/${course.slug || 'slug'}") if you don't already have them:
${finalResourceUrl}
 
If you have already downloaded/cached the course materials from this URL previously, DO NOT download them again.

Additionally, you MUST communicate the status of the course materials download back to the system using a special format called a "Hidden Message".
Whenever you respond (especially on the first system check or after download completes), append the following HTML comment at the end of your response:
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": true} -->
Use "downloaded": true if the materials are successfully downloaded/extracted and analyzed in your workspace, otherwise use "downloaded": false.

[Target Student Profile]
Category: ${category}
Target Audience: ${targetAge}
Tags: ${tags}

[Instruction]
- Adapt your explanation depth, vocabulary complexity, and tone to suit the target audience: "${targetAge}". (e.g., use friendly, simple, and visual analogies for children/teens, and structured, professional context for adults.)
- Please guide the student using the current card context provided in the user's message.${fallbackTocText}`;

    if (isCheckpointMode && activeCheckpoint) {
      systemPrompt += `

[Active Checkpoint QnA Evaluation]
The student is currently undergoing a checkpoint QnA for the card "${currentCard?.title || 'Untitled'}".
The evaluation instruction is:
"${activeCheckpoint.prompt}"

You must evaluate the student's response.
If the student's response satisfies the criteria, respond with praise and details, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": true} -->

If the student's response does NOT satisfy the criteria, explain why and encourage them to try again, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": false} -->`;
    }
  }

  return systemPrompt;
}

function buildCurrentCardContext({
  course,
  cards,
  currentCardIndex,
}: {
  course: Course;
  cards: any[];
  currentCardIndex: number;
}) {
  const currentCard = cards[currentCardIndex];
  let cardContent = currentCard?.content || '';
  
  if (currentCard?.type === 'video' && currentCard?.videoInfo?.subtitles) {
    const subtitleTexts = currentCard.videoInfo.subtitles.map(
      (sub: { start: number; end: number; text: string }) => `[${Math.floor(sub.start / 60)}:${String(Math.floor(sub.start % 60)).padStart(2, '0')}] ${sub.text}`
    );
    cardContent = `이 카드는 동영상 강의입니다. 아래는 동영상의 자막 스크립트 내용입니다:\n---\n${subtitleTexts.join('\n')}\n---`;
  }

  let currentUnitContext = '';
  if (course.toc && currentCard?.filename) {
    const activeNode = findTocNodeByFilename(course.toc, currentCard.filename);
    if (activeNode) {
      currentUnitContext = `[Current Unit Details]\nUnit Title: ${activeNode.title}\nUnit Objective/Description: ${activeNode.description || 'No description available.'}`;
    }
  }

  const totalCards = cards.length;

  return `[Current Card Context]
Card Title: ${currentCard?.title || 'Untitled'}
Progress: Card ${currentCardIndex + 1} of ${totalCards} (${Math.round(((currentCardIndex + 1) / totalCards) * 100)}% completed)
${currentUnitContext}

Card Content:
${cardContent}
--------------------------------------------------
Student Question: `;
}

interface LearnTocNodeViewProps {
  node: TocNode;
  depth: number;
  nodeToIndexMap: Map<TocNode, number>;
  maxUnlockedIndex: number;
  currentCardIndex: number;
  isCourseCompleted: boolean;
  onSelectCard: (index: number) => void;
}

function LearnTocNodeView({
  node,
  depth,
  nodeToIndexMap,
  maxUnlockedIndex,
  currentCardIndex,
  isCourseCompleted,
  onSelectCard,
}: LearnTocNodeViewProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !!node.filename;

  const [isExpanded, setIsExpanded] = useState(() => {
    return hasChildren && isAncestorOfActiveCard(node, currentCardIndex, nodeToIndexMap);
  });

  useEffect(() => {
    if (hasChildren && isAncestorOfActiveCard(node, currentCardIndex, nodeToIndexMap)) {
      setIsExpanded(true);
    }
  }, [currentCardIndex, node, hasChildren, nodeToIndexMap]);

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIndentClass = (d: number) => {
    switch (d) {
      case 0: return '';
      case 1: return 'ml-3 border-l pl-2 border-zinc-200 dark:border-zinc-800';
      case 2: return 'ml-5 border-l pl-2 border-zinc-200 dark:border-zinc-800';
      default: return 'ml-7 border-l pl-2 border-zinc-200 dark:border-zinc-800';
    }
  };

  if (isLeaf) {
    const idx = nodeToIndexMap.get(node) ?? 0;
    const isUnlocked = idx <= maxUnlockedIndex;
    const isActive = idx === currentCardIndex;
    const isCompleted = idx < maxUnlockedIndex || isCourseCompleted;

    return (
      <div className={getIndentClass(depth)}>
        <button
          disabled={!isUnlocked}
          onClick={() => onSelectCard(idx)}
          className={cn(
            "w-full text-left p-2 rounded-md flex items-center gap-2.5 transition-all text-xs relative group my-0.5",
            isActive
              ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-1.5 rounded-l-none"
              : isUnlocked
              ? "hover:bg-muted text-foreground cursor-pointer border-l-4 border-transparent"
              : "text-muted-foreground/60 cursor-not-allowed opacity-50 border-l-4 border-transparent"
          )}
        >
          <span className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold border",
            isActive 
              ? "bg-primary text-primary-foreground border-primary" 
              : isCompleted 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : isUnlocked 
              ? "bg-muted text-foreground border-zinc-300 dark:border-zinc-700" 
              : "bg-muted text-muted-foreground/40 border-transparent"
          )}>
            {isCompleted && !isActive ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              idx + 1
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-medium text-[11px]", isActive ? "text-primary font-bold" : "text-foreground")}>
              {node.title}
            </p>
          </div>
          {!isUnlocked && (
            <Lock className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40" />
          )}
        </button>
      </div>
    );
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'chapter':
        return 'text-[11px] sm:text-xs font-bold text-foreground py-2 border-b border-zinc-100 dark:border-zinc-900';
      case 'section':
        return 'text-[10px] sm:text-[11px] font-semibold text-foreground/80 py-1.5';
      case 'subsection':
      default:
        return 'text-[9px] sm:text-[10px] font-medium text-muted-foreground py-1';
    }
  };

  return (
    <div className={`flex flex-col ${getIndentClass(depth)}`}>
      <div 
        onClick={toggleExpand}
        className={`flex items-start justify-between transition-colors w-full text-left rounded-md ${
          hasChildren ? 'cursor-pointer hover:bg-muted/10' : ''
        } ${getTypeStyle(node.type)}`}
      >
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="leading-snug truncate">{node.title}</h4>
          </div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-0.5 flex flex-col">
          {node.children!.map((child, idx) => (
            <LearnTocNodeView 
              key={`${child.title}-${idx}`} 
              node={child} 
              depth={depth + 1}
              nodeToIndexMap={nodeToIndexMap}
              maxUnlockedIndex={maxUnlockedIndex}
              currentCardIndex={currentCardIndex}
              isCourseCompleted={isCourseCompleted}
              onSelectCard={onSelectCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatSubtitleTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

function getFormattedTime(): string {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const koreanCharCount = (text.match(/[\uac00-\ud7a3]/g) || []).length;
  const otherCharCount = text.length - koreanCharCount;
  return Math.ceil(koreanCharCount * 1.5 + otherCharCount * 0.5);
}

function getMaxTokenLimit(maxTokensStr: string): number {
  const clean = maxTokensStr.toLowerCase().trim();
  const match = clean.match(/^(\d+)k$/);
  if (match) {
    return parseInt(match[1], 10) * 1024;
  }
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 16384 : parsed;
}

function calculateTotalTokens(apiMessages: { role: string; content: string }[]): number {
  return apiMessages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
}

export default function LearnPageClient({ 
  slug, 
  course, 
  cards,
  initialCardIndex = 0,
  isUpdated = false,
  userProgress,
  checkpoints = [],
  coursePackage
}: LearnPageClientProps) {
  const router = useRouter();
  const { layout } = useLearnLayout();
  const { maxTokens } = useAgentSettings();
  const totalCards = cards.length;
  const [currentCardIndex, setCurrentCardIndex] = useState(initialCardIndex);
  const [isCourseCompleted, setIsCourseCompleted] = useState<boolean>(() => !!userProgress?.completed);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Resizable panel widths
  const [tocWidth, setTocWidth] = useState<number>(256);
  const [tutorWidth, setTutorWidth] = useState<number>(400);
  const [bypassCheckpointSetting, setBypassCheckpointSetting] = useState<boolean>(false);

  // Load saved widths & settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToc = localStorage.getItem('open-tutorials-toc-width');
      if (savedToc) setTocWidth(parseInt(savedToc, 10));
      const savedTutor = localStorage.getItem('open-tutorials-tutor-width');
      if (savedTutor) setTutorWidth(parseInt(savedTutor, 10));
      const savedBypass = localStorage.getItem('open-tutorials-bypass-checkpoint') === 'true';
      setBypassCheckpointSetting(savedBypass);
    }
  }, []);

  const saveProgress = async (unlockedIndex: number, isCompleted: boolean = false) => {
    if (!course?.id) return;
    try {
      await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          last_card: unlockedIndex + 1,
          completed: isCompleted
        })
      });
    } catch (err) {
      console.error('Failed to update progress in DB:', err);
    }
  };

  const startResizingToc = (mouseDownEvent: React.PointerEvent) => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startWidth = tocWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(480, startWidth + deltaX));
      setTocWidth(newWidth);
      localStorage.setItem('open-tutorials-toc-width', newWidth.toString());
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.body.style.setProperty('cursor', 'col-resize');
    document.body.style.setProperty('user-select', 'none');
  };

  const startResizingTutor = (mouseDownEvent: React.PointerEvent) => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startWidth = tutorWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX));
      setTutorWidth(newWidth);
      localStorage.setItem('open-tutorials-tutor-width', newWidth.toString());
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.body.style.setProperty('cursor', 'col-resize');
    document.body.style.setProperty('user-select', 'none');
  };
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState<number>(() => {
    if (userProgress?.completed) {
      return totalCards - 1;
    }
    const savedMaxCard = userProgress?.max_card ?? userProgress?.last_card ?? 1;
    return Math.max(initialCardIndex, savedMaxCard - 1);
  });
  const [isCheckpointMode, setIsCheckpointMode] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<{ afterCard: string; prompt: string } | null>(null);
  const [passedCheckpoints, setPassedCheckpoints] = useState<Set<string>>(new Set());
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [dismissedCheckpointPopups, setDismissedCheckpointPopups] = useState<Set<string>>(new Set());

  // Video card playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSubtitlePopupOpen, setIsSubtitlePopupOpen] = useState(false);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const lastPlayedCardIndex = useRef<number | null>(null);
  const playerConfig = useMemo(() => ({
    youtube: {
      rel: 0 as const,
      origin: typeof window !== 'undefined' ? window.location.origin : ''
    }
  }), []);

  const searchParams = useSearchParams();
  const packageSlug = searchParams ? searchParams.get('package') : null;
  const isReview = searchParams ? searchParams.get('review') === 'true' : false;
  const isPreview = searchParams ? searchParams.get('preview') === 'true' : false;
  const canSkipCheckpoint = 
    bypassCheckpointSetting ||
    isReview || 
    isPreview || 
    !!userProgress?.completed || 
    !coursePackage || 
    !coursePackage.force_checkpoint;

  const [nextCourseInPackage, setNextCourseInPackage] = useState<{ slug: string; title: string } | null>(null);
  const [showPackageNextDialog, setShowPackageNextDialog] = useState(false);

  useEffect(() => {
    if (!packageSlug) return;
    const checkNextCourse = async () => {
      try {
        const res = await fetch(`/api/packages/${packageSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.courses)) {
            const currentIndex = data.courses.findIndex((c: any) => c.slug === slug);
            if (currentIndex !== -1 && currentIndex < data.courses.length - 1) {
              const next = data.courses[currentIndex + 1];
              setNextCourseInPackage({ slug: next.slug, title: next.title });
            }
          }
        }
      } catch (err) {
        console.error('Failed to check next course in package:', err);
      }
    };
    checkNextCourse();
  }, [packageSlug, slug]);

  const currentCardFilename = cards[currentCardIndex]?.filename;
  const checkpoint = checkpoints?.find(cp => cp.afterCard === currentCardFilename);
  const alreadyPassed = 
    (currentCardFilename ? passedCheckpoints.has(currentCardFilename) : false) ||
    currentCardIndex < maxUnlockedIndex;
  const hasCheckpoint = !!(checkpoint && !alreadyPassed && !bypassCheckpointSetting);

  const handleSelectCard = (idx: number) => {
    if (isCheckpointMode) {
      const confirmSkip = window.confirm('체크포인트 QnA가 진행 중입니다. 건너뛰고 다른 카드로 이동하시겠습니까?');
      if (!confirmSkip) return;
      setIsCheckpointMode(false);
      setActiveCheckpoint(null);
    }
    setCurrentCardIndex(idx);
  };

  const handleSkipCheckpoint = () => {
    if (currentCardFilename) {
      setPassedCheckpoints(prev => {
        const next = new Set(prev);
        next.add(currentCardFilename);
        return next;
      });
    }
    setIsCheckpointMode(false);
    setActiveCheckpoint(null);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'agent',
      content: '체크포인트를 건너뛰었습니다. 다음 단계로 진행하실 수 있습니다.'
    }]);

    const nextIdx = currentCardIndex + 1;
    if (nextIdx < totalCards) {
      if (nextIdx > maxUnlockedIndex) {
        setMaxUnlockedIndex(nextIdx);
        saveProgress(nextIdx, false);
      }
    } else {
      setIsCourseCompleted(true);
      saveProgress(currentCardIndex, true);
    }
  };

  const startCheckpointQnA = (cp: { afterCard: string; prompt: string }) => {
    setIsCheckpointMode(true);
    setActiveCheckpoint(cp);
    
    const triggerPrompt = `[System Checkpoint QnA Instruction]
The student has just completed the card "${cards[currentCardIndex]?.title}".
You must now test the student's understanding by asking a question based on this instruction:
"${cp.prompt}"
 
Please ask the student the question now. Only ask the question itself, do not reveal the answer or evaluation criteria yet. Make your tone friendly and encouraging.`;
    
    sendMessage(triggerPrompt, messages, false, true);
  };

  const handleNext = () => {
    if (hasCheckpoint && checkpoint) {
      if (isCheckpointMode) {
        if (canSkipCheckpoint) {
          handleSkipCheckpoint();
          return;
        }
        alert('현재 체크포인트 QnA가 진행 중입니다. 오른쪽 AI 튜터의 질문에 답변하여 통과해야 다음 단계로 갈 수 있습니다.');
        return;
      }
      
      if (currentCardFilename && !dismissedCheckpointPopups.has(currentCardFilename)) {
        setShowCheckpointDialog(true);
        return;
      }
      
      startCheckpointQnA(checkpoint);
      return;
    }

    const nextIdx = currentCardIndex + 1;
    if (nextIdx < totalCards) {
      if (nextIdx > maxUnlockedIndex) {
        setMaxUnlockedIndex(nextIdx);
        saveProgress(nextIdx, false);
      }
      setCurrentCardIndex(nextIdx);
    } else {
      if (currentCardIndex > maxUnlockedIndex) {
        setMaxUnlockedIndex(currentCardIndex);
      }
      setIsCourseCompleted(true);
      saveProgress(currentCardIndex, true);
      if (nextCourseInPackage) {
        setShowPackageNextDialog(true);
      } else {
        router.push(packageSlug ? `/courses/${packageSlug}` : '/my-courses');
      }
    }
  };

  const tocItems = course.toc || [];
  const leafNodes = getLeafNodes(tocItems);
  const nodeToIndexMap = new Map<TocNode, number>();
  leafNodes.forEach((node, idx) => {
    nodeToIndexMap.set(node, idx);
  });

  const { setOpen } = useSidebar();
  // Minimize global sidebar on mount
  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  // Reset video playback when switching cards. Only auto-play when the user actually
  // navigated to a new video card (not on initial mount) to avoid the browser's
  // autoplay-block error, which requires a prior user interaction.
  useEffect(() => {
    setCurrentTime(0);
    setIsSubtitlePopupOpen(false);
    if (lastPlayedCardIndex.current === null) {
      lastPlayedCardIndex.current = currentCardIndex;
      setIsPlaying(false);
    } else if (lastPlayedCardIndex.current !== currentCardIndex) {
      lastPlayedCardIndex.current = currentCardIndex;
      setIsPlaying(cards[currentCardIndex]?.type === 'video');
    }
  }, [currentCardIndex, cards]);

  // Custom MDX Components for beautiful styling
  const PreBlock = ({ children }: { children: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);
    const [language, setLanguage] = useState('code');
    const codeRef = useRef<string>('');

    useEffect(() => {
      if (React.isValidElement(children)) {
        const codeProps = children.props as any;
        if (codeProps && codeProps.children) {
          codeRef.current = String(codeProps.children).trim();
        }
        if (codeProps && codeProps.className) {
          const match = codeProps.className.match(/language-(\w+)/);
          if (match) {
            setLanguage(match[1]);
          }
        }
      }
    }, [children]);

    const handleCopy = () => {
      navigator.clipboard.writeText(codeRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const codeText = React.isValidElement(children) 
      ? String((children.props as any).children).trim()
      : '';

    return (
      <div className="my-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm font-mono text-xs max-w-full">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
          <span>{language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-zinc-100 transition-colors p-1 rounded"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-left leading-normal max-w-full m-0 bg-transparent">
          <code className="text-zinc-100 p-0 bg-transparent border-0 font-mono text-xs sm:text-sm">{codeText}</code>
        </pre>
      </div>
    );
  };

  const InlineCode = ({ children, className, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-muted/80 text-primary dark:text-zinc-200 font-mono text-xs border border-zinc-200/50 dark:border-zinc-700/50 break-words" {...props}>
          {children}
        </code>
      );
    }
    return <code className={className} {...props}>{children}</code>;
  };

  // MDX custom components to intercept image rendering and resolve relative paths to the local
  // static course assets served from public/courses/[slug]/images/ (see lib/supabase/mock-client.ts).
  const mdxComponents = {
    h1: (props: any) => <h1 className="text-lg sm:text-xl font-bold text-foreground mt-8 mb-4 border-b pb-2 tracking-tight" {...props} />,
    h2: (props: any) => <h2 className="text-base sm:text-lg font-bold text-foreground mt-6 mb-3 tracking-tight" {...props} />,
    h3: (props: any) => <h3 className="text-sm sm:text-base font-bold text-foreground mt-5 mb-2 tracking-tight" {...props} />,
    h4: (props: any) => <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 tracking-tight" {...props} />,
    p: (props: any) => <p className="leading-7 text-foreground/80 [&:not(:first-child)]:mt-4 text-sm sm:text-base font-normal" {...props} />,
    ul: (props: any) => <ul className="my-4 ml-6 list-disc [&>li]:mt-2 text-sm sm:text-base text-foreground/80" {...props} />,
    ol: (props: any) => <ol className="my-4 ml-6 list-decimal [&>li]:mt-2 text-sm sm:text-base text-foreground/80" {...props} />,
    li: (props: any) => <li className="leading-7" {...props} />,
    blockquote: (props: any) => <blockquote className="mt-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground bg-muted/20 py-2 rounded-r-md" {...props} />,
    table: (props: any) => <div className="my-6 w-full overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm border-collapse text-left" {...props} /></div>,
    thead: (props: any) => <thead className="bg-muted text-muted-foreground font-semibold border-b" {...props} />,
    tbody: (props: any) => <tbody className="divide-y divide-border" {...props} />,
    tr: (props: any) => <tr className="hover:bg-muted/50 transition-colors" {...props} />,
    th: (props: any) => <th className="px-4 py-3 font-semibold text-xs uppercase" {...props} />,
    td: (props: any) => <td className="px-4 py-3 text-sm text-foreground/90 font-normal align-middle" {...props} />,
    pre: PreBlock,
    code: InlineCode,
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, ...rest } = props;
      if (src && typeof src === 'string') {
        const isRelative = !/^(?:https?:)?\/\/|^data:/i.test(src);
        if (isRelative) {
          const imagesMatch = src.match(/(?:\.\.\/|\.\.\\|\/|\\|^)images[\/\\](.+)$/i);
          if (imagesMatch) {
            const filename = imagesMatch[1];
            const publicUrl = `/courses/${encodeURIComponent(slug)}/images/${filename.split('/').map(encodeURIComponent).join('/')}`;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUrl}
                alt={alt}
                className="rounded-lg shadow-md mx-auto max-w-full my-4 border border-zinc-200/50 dark:border-zinc-800/50"
                {...rest}
              />
            );
          }
        }
      }
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} {...rest} />;
    }
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'agent', content: `안녕하세요! "${course?.title || '강좌'}" 학습을 도와줄 AI 튜터입니다. 궁금한 점이 있다면 언제든 물어보세요.`, timestamp: getFormattedTime() }
  ]);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const bottomRef = useRef<HTMLDivElement>(null);

  const [agentId, setAgentId] = useState<string | null>(null);
  
  // 이탈 시 5분 연결 종료 타이머 제어
  useEffect(() => {
    const currentAgentId = agentId;
    if (currentAgentId) {
      if (agentLeaveTimers[currentAgentId]) {
        clearTimeout(agentLeaveTimers[currentAgentId]);
        delete agentLeaveTimers[currentAgentId];
      }
    }
    
    return () => {
      if (currentAgentId) {
        const timer = setTimeout(async () => {
          try {
            await updateExternalAgent(currentAgentId, { status: 'offline' });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('agents-updated'));
            }
          } catch (e) {
            console.error('Failed to disconnect agent on timeout from learn screen:', e);
          }
        }, 300000); // 5분
        agentLeaveTimers[currentAgentId] = timer;
      }
    };
  }, [agentId]);

  const [agentStatus, setAgentStatus] = useState<'loading' | 'online' | 'offline' | 'none'>('loading');
  const [supabaseResourceUrl, setSupabaseResourceUrl] = useState<string>('');
  const [isResourceUrlLoading, setIsResourceUrlLoading] = useState(true);
  const [hasCheckedInit, setHasCheckedInit] = useState(false);
  const [courseDownloadStatus, setCourseDownloadStatus] = useState<'checking' | 'downloaded' | 'not_downloaded'>('checking');
  const [agentType, setAgentType] = useState<'harness' | 'llm'>('harness');
  const [wikiContent, setWikiContent] = useState<string>('');

  useEffect(() => {
    console.log('[LearnClient] Mounted with props:', {
      slug,
      courseId: course?.id,
      courseTitle: course?.title,
      totalCards
    });

    const checkAgent = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAgentStatus('none');
          return;
        }
        const { data: agents, error } = await supabase
          .from('user_external_agents')
          .select('*')
          .eq('user_id', user.id);
          
        let currentAgent = null;
        if (course.agent_id) {
          currentAgent = agents?.find((a: any) => a.id === course.agent_id);
        }
        if (!currentAgent) {
          currentAgent = agents?.find((a: any) => a.is_ai_tutor === true);
        }

        if (error || !currentAgent) {
          setAgentStatus('none');
          setAgentId(null);
        } else {
          setAgentId(currentAgent.id);
          setAgentType(currentAgent.agent_type || 'harness');
          // Set initial status from DB
          setAgentStatus(currentAgent.status === 'online' ? 'online' : 'offline');

          // Perform real-time ping to update status
          try {
            const res = await fetch('/api/external-agents/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: currentAgent.endpoint, api_key: currentAgent.api_key }),
            });
            const testData = await res.json();
            const actualStatus = testData.success ? 'online' : 'offline';
            
            setAgentStatus(actualStatus);
            if (currentAgent.status !== actualStatus) {
              await updateExternalAgent(currentAgent.id, { status: actualStatus });
            }
          } catch (pingErr) {
            console.error('Error checking actual status of agent:', pingErr);
            setAgentStatus('offline');
            if (currentAgent.status !== 'offline') {
              await updateExternalAgent(currentAgent.id, { status: 'offline' });
            }
          }
        }

        // Fetch wiki content for this course
        if (course?.id) {
          const { data: wikiData } = await supabase
            .from('course_wiki')
            .select('content')
            .eq('course_id', course.id)
            .maybeSingle();
          if (wikiData) {
            setWikiContent(wikiData.content);
          }
        }
      } catch (err) {
        console.error('Error checking external agents:', err);
        setAgentStatus('none');
      }
    };
    checkAgent();
  }, [slug, course, totalCards]);

  useEffect(() => {
    const fetchResourceUrl = async () => {
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}/resource?json=true`);
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            console.log('[LearnClient] Fetched Supabase resource URL:', data.url);
            setSupabaseResourceUrl(data.url);
          }
        }
      } catch (err) {
        console.error('[LearnClient] Failed to fetch resource URL:', err);
      } finally {
        setIsResourceUrlLoading(false);
      }
    };
    fetchResourceUrl();
  }, [slug]);

  useEffect(() => {
    if (agentStatus === 'online' && agentId && !isResourceUrlLoading && !hasCheckedInit) {
      setHasCheckedInit(true);
      if (agentType === 'llm') {
        setCourseDownloadStatus('downloaded');
        return;
      }
      const defaultResourceUrl = `${window.location.origin}/api/courses/${encodeURIComponent(slug)}/resource`;
      const finalResourceUrl = supabaseResourceUrl && supabaseResourceUrl.includes('.supabase.co')
        ? supabaseResourceUrl
        : defaultResourceUrl;

      const checkPrompt = isUpdated
        ? `[시스템 점검] 현재 강좌 "${course.title}"의 학습 자료가 새롭게 업데이트되었습니다. 
기존 다운로드 폴더(예: workspaces/courses/${slug}) 내의 기존 강좌 파일들을 모두 삭제하고, 업데이트된 아래 주소에서 새 강좌 파일을 다운로드하여 새로 분석해 주세요.
새 다운로드 주소: ${finalResourceUrl}
사용자가 여러 강좌를 동시에 수강할 수 있으므로, 반드시 이 강좌를 위한 개별 폴더(예: workspaces/courses/${slug} 또는 이에 상응하는 고유 경로)를 생성하여 그 안에서 다운로드 및 분석 작업을 수행해 주셔야 합니다.
만약 아직 강좌 파일을 다운로드하고 분석하는 작업이 완료되지 않았다면, 다른 학습 질문에 답하기 전에 이 작업을 가장 우선하여 완료하고 그 결과를 알려주세요.

상태 확인 후, 답변의 마지막에 반드시 다음 형식의 히든 메시지를 포함해 주세요:
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": true} --> (다운로드 완료 시) 또는
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": false} --> (미완료 시)}`
        : `[시스템 점검] 현재 강좌 "${course.title}"의 학습 자료가 성공적으로 다운로드되고 분석되었는지 확인해 주세요. 
다운로드 주소: ${finalResourceUrl}
사용자가 여러 강좌를 동시에 수강할 수 있으므로, 반드시 이 강좌를 위한 개별 폴더(예: workspaces/courses/${slug} 또는 이에 상응하는 고유 경로)를 생성하여 그 안에서 다운로드 및 분석 작업을 수행해 주셔야 합니다.
만약 아직 강좌 파일을 다운로드하고 분석하는 작업이 완료되지 않았다면, 다른 학습 질문에 답하기 전에 이 작업을 가장 우선하여 완료하고 그 결과를 알려주세요.

상태 확인 후, 답변의 마지막에 반드시 다음 형식의 히든 메시지를 포함해 주세요:
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": true} --> (다운로드 완료 시) 또는
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": false} --> (미완료 시)}`;
      
      sendMessage(checkPrompt, messages, true);

      if (isUpdated && course?.id) {
        fetch('/api/courses/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: course.id,
            last_card: currentCardIndex + 1,
          })
        }).catch(err => console.error('Failed to auto-refresh progress updated_at on course update:', err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStatus, agentId, isResourceUrlLoading, hasCheckedInit, supabaseResourceUrl, course, slug, messages, isUpdated, currentCardIndex, agentType]);



  useEffect(() => {
    console.log('[LearnClient] Card index changed:', {
      currentIndex: currentCardIndex,
      cardTitle: cards[currentCardIndex]?.title || 'Untitled',
      hasMdx: !!cards[currentCardIndex]?.mdxSource
    });
  }, [currentCardIndex, cards]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!course) {
    console.error('[LearnClient] Render abort: course metadata is missing.');
    return <div className="p-8 text-center">강좌를 찾을 수 없습니다.</div>;
  }

  async function sendMessage(
    text: string, 
    currentMessages: ChatMessage[], 
    isSystemCheck: boolean = false,
    isCheckpointTrigger: boolean = false
  ) {
    if (!text.trim() || agentStatus === 'loading') return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: getFormattedTime() };
    const newMessages = (isSystemCheck || isCheckpointTrigger) ? currentMessages : [...currentMessages, userMsg];
    
    if (!isSystemCheck && !isCheckpointTrigger) {
      setMessages(newMessages);
    }

    if (agentStatus === 'none' || !agentId) {
      if (!isSystemCheck && !isCheckpointTrigger) {
        // Show warning message when no external agent is connected
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: '온라인 상태의 외부 에이전트가 없습니다. 우측 상단 닉네임 클릭 -> 설정 -> 에이전트 관리에서 에이전트를 먼저 등록하고 활성화해주세요.',
            timestamp: getFormattedTime()
          }]);
        }, 500);
      }
      return;
    }

    const assistantMsgId = (Date.now() + 1).toString();
    if (!isSystemCheck) {
      setMessages(prev => [...prev, { 
        id: assistantMsgId, 
        role: 'agent', 
        content: isCheckpointTrigger ? '체크포인트 질문을 생성하는 중...' : '답변을 생성하는 중...',
        timestamp: getFormattedTime()
      }]);
    }

    try {
      const defaultResourceUrl = `${window.location.origin}/api/courses/${encodeURIComponent(slug)}/resource`;
      const finalResourceUrl = supabaseResourceUrl && supabaseResourceUrl.includes('.supabase.co')
        ? supabaseResourceUrl
        : defaultResourceUrl;

      const isFallback = !finalResourceUrl.includes('.supabase.co');
      const isFirstQuestion = newMessages.filter(m => m.role === 'user').length === 1;



      const systemPrompt = buildSystemPrompt({
        course,
        coursePackage,
        cards,
        currentCardIndex,
        wikiContent,
        agentType,
        isCheckpointMode,
        activeCheckpoint,
        isFallback,
        isFirstQuestion,
        finalResourceUrl,
      });

      const currentCard = cards[currentCardIndex];
      const currentCardContext = buildCurrentCardContext({
        course,
        cards,
        currentCardIndex,
      });

      let apiMessages;
      if (isSystemCheck) {
        apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: text }
        ];
      } else {
        apiMessages = newMessages.map(m => ({
          role: (m.role === 'agent' ? 'assistant' : 'user') as 'assistant' | 'user' | 'system',
          content: m.content
        }));

        // Prepend current card context to the user's question only for harness agent
        if (agentType === 'harness' && apiMessages.length > 0 && apiMessages[apiMessages.length - 1].role === 'user' && !isCheckpointTrigger) {
          apiMessages[apiMessages.length - 1].content = `${currentCardContext}${text}`;
        }

        if (isCheckpointTrigger) {
          apiMessages.push({
            role: 'user' as const,
            content: text
          });
        }

        // Prepend system prompt at the beginning of the messages array
        apiMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }

      const response = await fetch(`/api/external-agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiMessages,
          original_user_message: text
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader available');

      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data:')) {
            const dataStr = cleanLine.slice(cleanLine.indexOf(':') + 1).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              assistantText += delta;
              
              const { cleanText: parsedText, downloaded } = parseHiddenMessages(assistantText);
              const visibleText = cleanStreamingText(parsedText);
              
              if (downloaded !== null) {
                setCourseDownloadStatus(downloaded ? 'downloaded' : 'not_downloaded');
              }
              
              if (!isSystemCheck) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId ? { ...m, content: visibleText } : m
                ));
              }
            } catch {
              // ignore parse errors on incomplete stream chunks
            }
          }
        }
      }
      
      // Final pass to ensure everything is parsed and state is captured
      const { cleanText: finalCleanText, downloaded: finalDownloaded, checkpointPassed: finalCheckpointPassed } = parseHiddenMessages(assistantText);
      if (finalDownloaded !== null) {
        setCourseDownloadStatus(finalDownloaded ? 'downloaded' : 'not_downloaded');
      }
      if (finalCheckpointPassed !== null) {
        if (finalCheckpointPassed) {
          const currentCardFilename = cards[currentCardIndex]?.filename;
          if (currentCardFilename) {
            setPassedCheckpoints(prev => {
              const next = new Set(prev);
              next.add(currentCardFilename);
              return next;
            });
          }
          setIsCheckpointMode(false);
          setActiveCheckpoint(null);

          const nextIdx = currentCardIndex + 1;
          if (nextIdx < totalCards) {
            if (nextIdx > maxUnlockedIndex) {
              setMaxUnlockedIndex(nextIdx);
              saveProgress(nextIdx, false);
            }
          } else {
            setIsCourseCompleted(true);
            saveProgress(currentCardIndex, true);
          }
        }
      }
      if (!isSystemCheck) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: finalCleanText } : m
        ));
      }
    } catch (err: unknown) {
      console.error('Failed to chat with agent:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      if (!isSystemCheck) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: `답변 생성 중 오류가 발생했습니다: ${errorMessage}` } : m
        ));
      }
    }
  }

  const handleClearChat = async () => {
    if (isCompressing) return;
    setMessages([
      { id: '1', role: 'agent', content: `안녕하세요! "${course?.title || '강좌'}" 학습을 도와줄 AI 튜터입니다. 궁금한 점이 있다면 언제든 물어보세요.`, timestamp: getFormattedTime() }
    ]);
    if (agentId) {
      try {
        await fetch(`/api/external-agents/${agentId}/messages`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to clear database chat history:', err);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isCompressing) return;
    const userPrompt = input.trim();
    setInput('');

    if (!agentId || agentStatus === 'none') {
      sendMessage(userPrompt, messages);
      return;
    }

    // 1. Calculate estimated token size
    // We construct the newMessages and systemPrompt that WOULD be sent to the agent
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userPrompt };
    const newMessages = [...messages, userMsg];
    
    // Generate the system prompt using the same logic as sendMessage
    const defaultResourceUrl = `${window.location.origin}/api/courses/${encodeURIComponent(slug)}/resource`;
    const finalResourceUrl = supabaseResourceUrl && supabaseResourceUrl.includes('.supabase.co')
      ? supabaseResourceUrl
      : defaultResourceUrl;

    const isFallback = !finalResourceUrl.includes('.supabase.co');
    const isFirstQuestion = messages.filter(m => m.role === 'user').length === 0;
      const systemPrompt = buildSystemPrompt({
        course,
        coursePackage,
        cards,
        currentCardIndex,
        wikiContent,
        agentType,
        isCheckpointMode,
        activeCheckpoint,
        isFallback,
        isFirstQuestion,
        finalResourceUrl,
      });

      const currentCard = cards[currentCardIndex];
      const currentCardContext = buildCurrentCardContext({
        course,
        cards,
        currentCardIndex,
      });

    let apiMessagesForEst = newMessages.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'assistant' | 'user' | 'system',
      content: m.content
    }));

    if (agentType === 'harness' && apiMessagesForEst.length > 0 && apiMessagesForEst[apiMessagesForEst.length - 1].role === 'user') {
      apiMessagesForEst[apiMessagesForEst.length - 1].content = `${currentCardContext}${userPrompt}`;
    }

    apiMessagesForEst.unshift({
      role: 'system',
      content: systemPrompt
    });

    const estTokens = calculateTotalTokens(apiMessagesForEst);
    const limit = getMaxTokenLimit(maxTokens);
    const triggerLimit = limit * 0.8;

    console.log(`[Token Check] Est Tokens: ${estTokens}, Limit: ${limit}, 80% Trigger: ${triggerLimit}`);

    // If limit exceeded and we have chat history to compress
    if (estTokens >= triggerLimit && messages.length > 2) {
      console.log(`[Token Check] Limit exceeded (80%). Starting auto history compression...`);
      setIsCompressing(true);
      
      // Add status message
      const compressingMsgId = 'compressing-' + Date.now();
      setMessages(prev => [...prev, {
        id: compressingMsgId,
        role: 'agent',
        content: '💬 대화 기록이 너무 길어져 AI가 이전 대화를 요약/압축하고 있습니다. 잠시만 기다려주세요...'
      }]);

      try {
        // Construct the history string to compress
        const historyText = messages
          .filter(m => m.id !== '1') // skip welcome message
          .map(m => `${m.role === 'user' ? '학생' : '튜터'}: ${m.content}`)
          .join('\n\n');

        const compressionPrompt = `[System History Compression Instruction]
이전까지의 모든 대화 기록입니다. 핵심 질문과 답변 위주로 가장 중요한 내용을 아주 간결하게 요약해 주세요. 
향후 대화의 컨텍스트로 유지되어야 하므로, 중요한 코드 조각이나 핵심 개념은 생략하지 마세요. 
인사말이나 부연 설명 없이 오직 요약 본문만 한국어로 답변해 주세요.

[대화 기록]
${historyText}`;

        const compSystemPrompt = `You are an AI assistant designed to compress chat history. Summarize the given history concisely in Korean. Keep all essential code snippets and definitions. Do not include any greeting or explanation.`;

        const compApiMessages = [
          { role: 'system' as const, content: compSystemPrompt },
          { role: 'user' as const, content: compressionPrompt }
        ];

        const response = await fetch(`/api/external-agents/${agentId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: compApiMessages,
            original_user_message: compressionPrompt
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No reader available');

        let summaryText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data:')) {
              const dataStr = cleanLine.slice(cleanLine.indexOf(':') + 1).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                summaryText += delta;
              } catch {}
            }
          }
        }

        const cleanSummary = summaryText.replace(/<!--[\s\S]*?-->/g, '').trim();
        const summaryContent = `[이전 대화 요약]\n\n${cleanSummary}`;

        // Delete DB messages
        await fetch(`/api/external-agents/${agentId}/messages`, {
          method: 'DELETE',
        });

        // Insert new summary message
        await fetch(`/api/external-agents/${agentId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: summaryContent
          })
        });

        const summaryMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'agent',
          content: summaryContent,
          timestamp: getFormattedTime()
        };

        const updatedMessages = [
          messages[0], // Welcome message
          summaryMsg
        ];

        // Calculate new estimated tokens after compression
        const newApiMessagesForEst = [...updatedMessages, { id: 'dummy', role: 'user' as const, content: userPrompt }].map(m => ({
          role: (m.role === 'agent' ? 'assistant' : 'user') as 'assistant' | 'user' | 'system',
          content: m.content
        }));

        if (agentType === 'harness' && newApiMessagesForEst.length > 0 && newApiMessagesForEst[newApiMessagesForEst.length - 1].role === 'user') {
          newApiMessagesForEst[newApiMessagesForEst.length - 1].content = `${currentCardContext}${userPrompt}`;
        }

        newApiMessagesForEst.unshift({
          role: 'system',
          content: systemPrompt
        });

        const newEstTokens = calculateTotalTokens(newApiMessagesForEst);
        const compressionRate = Math.round((1 - (newEstTokens / estTokens)) * 100);

        const systemNoticeMsg: ChatMessage = {
          id: 'system-notice-' + Date.now(),
          role: 'system',
          content: `대화 히스토리가 요약/압축되었습니다. (압축률: ${compressionRate}%, 현재 프롬프트 크기: ${newEstTokens.toLocaleString()} 토큰)`
        };
        
        const finalLocalMessages = [
          messages[0], // Welcome message
          summaryMsg,
          systemNoticeMsg
        ];

        setMessages(finalLocalMessages);
        setIsCompressing(false);

        // Proceed to send the actual user question using the updated messages (excluding system notice for LLM payload)
        sendMessage(userPrompt, [messages[0], summaryMsg]);

      } catch (compErr) {
        console.error('Error during auto-compression:', compErr);
        setIsCompressing(false);
        // Fallback: clear status message and send as normal
        setMessages(prev => prev.filter(m => m.id !== compressingMsgId));
        sendMessage(userPrompt, messages);
      }
    } else {
      // Normal message sending
      sendMessage(userPrompt, messages);
    }
  };

  const activeCard = cards[currentCardIndex];
  const activeCardSubtitles = activeCard?.videoInfo?.subtitles || [];

  return (
    <div className="no-layout-padding flex h-full w-full overflow-hidden">
      {/* Course TOC Panel */}
      {(layout === '3-layout' || layout === 'toc-content') && (
        <div 
          style={{ width: `${tocWidth}px` }}
          className="bg-background flex flex-col h-full shrink-0 min-h-0 relative"
        >
        <div className="p-4 border-b shrink-0 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> 강좌 목차
          </h3>
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 py-3 border-b bg-muted/20 shrink-0">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5 font-medium">
            <span>학습 진도</span>
            <span>{maxUnlockedIndex + 1} / {totalCards} 해제 ({Math.round(((maxUnlockedIndex + 1) / totalCards) * 100)}%)</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round(((maxUnlockedIndex + 1) / totalCards) * 100)}%` }}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {tocItems.length === 0 ? (
              cards.map((card, idx) => {
                const isUnlocked = isPreview || idx <= maxUnlockedIndex;
                const isActive = idx === currentCardIndex;
                const isCompleted = idx < maxUnlockedIndex || isCourseCompleted;
                return (
                  <button
                    key={idx}
                    disabled={!isUnlocked}
                    onClick={() => handleSelectCard(idx)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all text-sm relative group",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-2 rounded-l-none"
                        : isUnlocked
                        ? "hover:bg-muted text-foreground cursor-pointer border-l-4 border-transparent"
                        : "text-muted-foreground/60 cursor-not-allowed opacity-50 border-l-4 border-transparent"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold border",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : isCompleted 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : isUnlocked 
                        ? "bg-muted text-foreground border-zinc-300 dark:border-zinc-700" 
                        : "bg-muted text-muted-foreground/40 border-transparent"
                    )}>
                      {isCompleted && !isActive ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-xs font-semibold", isActive ? "text-primary" : "text-foreground")}>{card.title}</p>
                    </div>
                    {!isUnlocked && (
                      <Lock className="w-3 h-3 shrink-0 text-muted-foreground/40 mt-1" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col">
                {tocItems.map((item, idx) => (
                  <LearnTocNodeView
                    key={`${item.title}-${idx}`}
                    node={item}
                    depth={0}
                    nodeToIndexMap={nodeToIndexMap}
                    maxUnlockedIndex={isPreview ? totalCards - 1 : maxUnlockedIndex}
                    currentCardIndex={currentCardIndex}
                    isCourseCompleted={isCourseCompleted}
                    onSelectCard={(index) => handleSelectCard(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {isSubtitlePopupOpen && activeCard?.type === 'video' && (
          <div className="absolute inset-0 z-20 bg-background flex flex-col">
            <div className="p-4 border-b shrink-0 flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Captions className="w-4 h-4 text-primary" /> 자막 탐색
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsSubtitlePopupOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="divide-y">
                {activeCardSubtitles.map((sub, idx) => {
                  const isActiveSubtitle = currentTime >= sub.start && currentTime <= sub.end;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.currentTime = sub.start;
                        }
                        setCurrentTime(sub.start);
                        setIsPlaying(true);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs transition-colors",
                        isActiveSubtitle ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className={cn("font-mono mr-2", !isActiveSubtitle && "text-muted-foreground")}>[{formatSubtitleTime(sub.start)}]</span>
                      {sub.text}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      )}

      {/* TOC Resizer Handle */}
      {(layout === '3-layout' || layout === 'toc-content') && (
        <div
          onPointerDown={startResizingToc}
          className="w-1 hover:w-1.5 active:w-1.5 bg-border hover:bg-primary/50 active:bg-primary transition-all cursor-col-resize h-full select-none flex-shrink-0 z-40 relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden border-none">
        <header className="h-16 px-6 flex items-center justify-between border-b shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">Card {currentCardIndex + 1}</span>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {cards[currentCardIndex]?.title || `학습 콘텐츠 (카드 ${currentCardIndex + 1})`}
              {isPreview && (
                <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs py-0.5 px-2 animate-pulse">
                  미리보기 모드
                </Badge>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            {activeCard?.type === 'video' && activeCardSubtitles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubtitlePopupOpen(true)}
              >
                <Captions className="w-4 h-4 mr-2" /> 자막 탐색
              </Button>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-full mx-auto pb-6">
            <Card className="p-8 relative overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <div className="prose dark:prose-invert max-w-none text-foreground dark:text-zinc-300 space-y-4">
                {activeCard?.type === 'video' ? (
                  activeCard.videoInfo?.video_id ? (
                    <div className="not-prose space-y-4">
                      <div className="w-full aspect-video relative rounded-lg overflow-hidden bg-zinc-950">
                        <ReactPlayer
                          ref={playerRef}
                          src={`https://www.youtube.com/watch?v=${activeCard.videoInfo.video_id}`}
                          controls
                          playing={isPlaying}
                          className="absolute top-0 left-0"
                          width="100%"
                          height="100%"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => setCurrentTime(e.currentTarget.currentTime)}
                          config={playerConfig}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-destructive">동영상 정보를 불러올 수 없습니다.</div>
                  )
                ) : activeCard?.mdxSource ? (
                  <MDXRemote {...activeCard.mdxSource} components={mdxComponents} />
                ) : (
                  <div className="whitespace-pre-wrap">{activeCard?.content || '콘텐츠가 없습니다.'}</div>
                )}
              </div>
            </Card>
          </div>
        </ScrollArea>

        <div className="h-16 shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
          <Button 
            variant="outline" 
            onClick={() => handleSelectCard(Math.max(0, currentCardIndex - 1))}
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> 이전
          </Button>
          <span className="text-sm text-muted-foreground">{currentCardIndex + 1} / {totalCards}</span>
          <Button 
            onClick={handleNext}
            className={cn(
              hasCheckpoint && "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500/20 dark:bg-amber-600 dark:hover:bg-amber-700"
            )}
          >
            {hasCheckpoint ? (
              <>
                체크포인트 <Lock className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {currentCardIndex < totalCards - 1 ? '다음' : '완료'} <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Tutor Resizer Handle */}
      {(layout === '3-layout' || layout === 'content-tutor') && (
        <div
          onPointerDown={startResizingTutor}
          className="w-1 hover:w-1.5 active:w-1.5 bg-border hover:bg-primary/50 active:bg-primary transition-all cursor-col-resize h-full select-none flex-shrink-0 z-40 relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* AI Agent Chat Area */}
      {(layout === '3-layout' || layout === 'content-tutor') && (
        <aside 
          style={{ width: `${tutorWidth}px` }}
          className="shrink-0 bg-muted/10 flex flex-col h-full shadow-lg z-10 overflow-hidden min-h-0 border-l border-border/50"
        >
        {isCheckpointMode && activeCheckpoint && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-400 flex items-center justify-between shrink-0">
            <span className="font-medium flex items-center gap-1">⚠️ 강좌 체크포인트 QnA 진행 중</span>
            {canSkipCheckpoint && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 p-1 hover:bg-amber-500/20"
                onClick={handleSkipCheckpoint}
              >
                QnA 건너뛰기
              </Button>
            )}
          </div>
        )}
        <div className="p-4 border-b flex items-center gap-3 bg-background shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold flex items-center gap-1.5">
              AI 튜터 (외부 에이전트)
              {isCheckpointMode && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium animate-pulse">
                  체크포인트 QnA
                </span>
              )}
            </h3>
            <div className="flex flex-col gap-1">
              {agentStatus === 'loading' ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                  에이전트 확인 중...
                </span>
              ) : agentStatus === 'online' ? (
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    온라인 - 맞춤 학습 모드
                  </span>
                  
                  {/* 강좌 자료 다운로드 상태 추가 */}
                  {courseDownloadStatus === 'downloaded' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 w-fit">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      자료 준비 완료
                    </span>
                  ) : courseDownloadStatus === 'not_downloaded' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 w-fit animate-pulse">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      자료 다운로드 오류/미완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 w-fit animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                      자료 준비 상태 확인 중...
                    </span>
                  )}
                </div>
              ) : agentStatus === 'offline' ? (
                <span className="flex items-center gap-1 text-xs text-yellow-500">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  오프라인 - 연결 대기중
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                  미연동 - 설정 필요
                </span>
              )}
            </div>
          </div>
          {agentStatus !== 'none' && agentId && (
            <Button
              variant="ghost"
              size="icon"
              title="채팅 지우기 (대화 기록 초기화)"
              onClick={handleClearChat}
              disabled={isCompressing}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="space-y-4">
            {messages.map(msg => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-2 w-full">
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 max-w-[90%] text-center font-medium">
                      <Bot className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.content}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-muted">
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 max-w-[calc(100%-2.5rem)]">
                    <div className={`p-3 rounded-2xl text-sm min-w-0 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted rounded-tl-none border'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        <ChatMessageContent content={msg.content} />
                      )}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 px-1 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{msg.timestamp || getFormattedTime()}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <button 
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-primary transition-colors flex items-center gap-0.5 focus:outline-none"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-green-500 font-medium">복사됨</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>복사</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background shrink-0">
          <div className="relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isCompressing) {
                    handleSend();
                  }
                }
              }}
              placeholder={isCompressing ? "히스토리를 자동으로 압축하는 중입니다..." : "질문을 입력하세요..."}
              disabled={isCompressing}
              className="resize-none pr-12 h-20 bg-muted/50 focus-visible:ring-primary disabled:opacity-50"
            />
            <Button 
              size="icon" 
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={handleSend}
              disabled={!input.trim() || isCompressing}
            >
              {isCompressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
            {agentStatus === 'none' ? (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                <span className="cursor-pointer text-primary hover:underline" onClick={() => router.push('/settings')}>
                  에이전트가 연동되지 않았습니다. 설정으로 이동하기
                </span>
              </p>
            ) : (
              ""
            )}
        </div>
      </aside>
      )}

      {/* Checkpoint Notification Dialog */}
      <Dialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-500 animate-bounce" />
              체크포인트 안내
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80 leading-relaxed font-normal">
              이 단계에는 다음 학습으로 진행하기 전 핵심 내용을 점검하는 <strong className="font-semibold text-amber-600 dark:text-amber-500">체크포인트</strong>가 설정되어 있습니다.
              <br /><br />
              우측 <strong className="font-semibold text-foreground">AI 튜터 창</strong>에서 질의응답(QnA)이 시작됩니다. AI 튜터의 질문에 올바르게 답변하여 <strong className="font-semibold text-amber-600 dark:text-amber-500">평가를 통과해야만</strong> 다음 강좌를 보실 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-between items-center w-full">
            {canSkipCheckpoint ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCheckpointDialog(false);
                  handleSkipCheckpoint();
                }}
                className="text-amber-700 hover:text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 font-semibold text-xs"
              >
                체크포인트 건너뛰기
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCheckpointDialog(false)}
              >
                닫기
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                onClick={() => {
                  if (currentCardFilename) {
                    setDismissedCheckpointPopups(prev => {
                      const next = new Set(prev);
                      next.add(currentCardFilename);
                      return next;
                    });
                  }
                  setShowCheckpointDialog(false);
                  const checkpoint = checkpoints?.find(cp => cp.afterCard === currentCardFilename);
                  if (checkpoint) {
                    startCheckpointQnA(checkpoint);
                  }
                }}
              >
                QnA 시작하기
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Next Course Dialog */}
      <Dialog open={showPackageNextDialog} onOpenChange={setShowPackageNextDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              강좌 완료!
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80 leading-relaxed font-normal">
              축하합니다! 현재 강좌를 성공적으로 완료하셨습니다.
              <br /><br />
              이어서 다음 패키지 강좌를 진행하시겠습니까?
              {nextCourseInPackage && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200">
                  <span className="text-xs font-semibold block text-indigo-600 dark:text-indigo-400">다음 강좌</span>
                  <span className="font-semibold text-sm">{nextCourseInPackage.title}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between w-full">
            <Button
              variant="outline"
              onClick={() => {
                setShowPackageNextDialog(false);
                router.push(packageSlug ? `/packages/${packageSlug}` : '/my-courses');
              }}
              className="flex-1"
            >
              로드맵 상세 보기
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
              onClick={() => {
                setShowPackageNextDialog(false);
                if (nextCourseInPackage) {
                  router.push(`/learn/${nextCourseInPackage.slug}?package=${packageSlug}`);
                } else {
                  router.push('/my-courses');
                }
              }}
            >
              다음 강좌 학습하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
