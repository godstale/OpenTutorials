'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Send, Bot, User, Bookmark, Share2, Copy, Check, Loader2, Lock, BookOpen, ChevronDown, CheckCircle2 } from 'lucide-react';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { Course, TocNode, CoursePackage } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { updateExternalAgent } from '@/lib/api/external-agents';
import { useSidebar } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn, agentLeaveTimers } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
}

interface LearnPageClientProps {
  slug: string;
  course: Course;
  cards: Array<{
    filename?: string;
    title: string;
    mdxSource?: MDXRemoteSerializeResult;
    content?: string;
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

        // Parse inline formatting (bold, inline code)
        // Inline code `code`
        const text = part;
        const subParts = text.split(/(`[^`\n]+`)/g);

        return (
          <span key={index}>
            {subParts.map((subPart, subIdx) => {
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return (
                  <code key={subIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-primary dark:text-zinc-200 font-mono text-xs border border-zinc-200/50 dark:border-zinc-700/50 break-words">
                    {subPart.slice(1, -1)}
                  </code>
                );
              }

              // Bold **text**
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

function isAncestorOfActiveCard(node: TocNode, activeFilename: string): boolean {
  if (!node.children) return false;
  for (const child of node.children) {
    if (child.filename === activeFilename) {
      return true;
    }
    if (isAncestorOfActiveCard(child, activeFilename)) {
      return true;
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

interface LearnTocNodeViewProps {
  node: TocNode;
  depth: number;
  filenameToIndexMap: Map<string, number>;
  maxUnlockedIndex: number;
  currentCardIndex: number;
  activeFilename?: string;
  onSelectCard: (index: number) => void;
}

function LearnTocNodeView({
  node,
  depth,
  filenameToIndexMap,
  maxUnlockedIndex,
  currentCardIndex,
  activeFilename,
  onSelectCard,
}: LearnTocNodeViewProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !!node.filename;

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (hasChildren && activeFilename && isAncestorOfActiveCard(node, activeFilename)) {
      setIsExpanded(true);
    }
  }, [activeFilename, node, hasChildren]);

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
    const idx = filenameToIndexMap.get(node.filename!) ?? 0;
    const isUnlocked = idx <= maxUnlockedIndex;
    const isActive = idx === currentCardIndex;

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
              : isUnlocked 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-muted text-muted-foreground/40 border-transparent"
          )}>
            {isUnlocked && !isActive ? (
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
              filenameToIndexMap={filenameToIndexMap}
              maxUnlockedIndex={maxUnlockedIndex}
              currentCardIndex={currentCardIndex}
              activeFilename={activeFilename}
              onSelectCard={onSelectCard}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  const totalCards = cards.length;
  const [currentCardIndex, setCurrentCardIndex] = useState(initialCardIndex);
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

  const searchParams = useSearchParams();
  const packageSlug = searchParams ? searchParams.get('package') : null;
  const isReview = searchParams ? searchParams.get('review') === 'true' : false;
  const isPreview = searchParams ? searchParams.get('preview') === 'true' : false;
  const canSkipCheckpoint = isReview || isPreview || !!userProgress?.completed || !coursePackage || !coursePackage.force_checkpoint;

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

  // Keep maxUnlockedIndex updated as currentCardIndex increases
  useEffect(() => {
    if (currentCardIndex > maxUnlockedIndex) {
      setMaxUnlockedIndex(currentCardIndex);
    }
  }, [currentCardIndex, maxUnlockedIndex]);

  const currentCardFilename = cards[currentCardIndex]?.filename;
  const checkpoint = checkpoints?.find(cp => cp.afterCard === currentCardFilename);
  const alreadyPassed = 
    (currentCardFilename ? passedCheckpoints.has(currentCardFilename) : false) ||
    currentCardIndex < maxUnlockedIndex;
  const hasCheckpoint = !!(checkpoint && !alreadyPassed);

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

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      if (nextCourseInPackage) {
        setShowPackageNextDialog(true);
      } else {
        router.push(packageSlug ? `/courses/${packageSlug}` : '/my-courses');
      }
    }
  };

  const tocItems = course.toc || [];
  const leafNodes = getLeafNodes(tocItems);
  const filenameToIndexMap = new Map<string, number>();
  leafNodes.forEach((node, idx) => {
    if (node.filename) {
      filenameToIndexMap.set(node.filename, idx);
    }
  });

  const { setOpen } = useSidebar();
  // Minimize global sidebar on mount
  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  // MDX custom components to intercept image rendering and resolve relative paths to Supabase Storage
  const mdxComponents = {
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, ...rest } = props;
      if (src && typeof src === 'string') {
        const imagesMatch = src.match(/(?:\.\.\/|\.\.\\|\/|\\|^)images[\/\\](.+)$/i);
        if (imagesMatch) {
          const filename = imagesMatch[1];
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbaxselsdfceyygdvpnj.supabase.co';
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/courses/${encodeURIComponent(slug)}/images/${encodeURIComponent(filename)}`;
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
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} {...rest} />;
    }
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'agent', content: `안녕하세요! "${course?.title || '강좌'}" 학습을 도와줄 AI 튜터입니다. 궁금한 점이 있다면 언제든 물어보세요.` }
  ]);
  const [input, setInput] = useState('');
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
          
        const tutorAgent = agents?.find((a: any) => a.is_ai_tutor === true);
        if (error || !tutorAgent) {
          setAgentStatus('none');
          setAgentId(null);
        } else {
          setAgentId(tutorAgent.id);
          // Set initial status from DB
          setAgentStatus(tutorAgent.status === 'online' ? 'online' : 'offline');

          // Perform real-time ping to update status
          try {
            const res = await fetch('/api/external-agents/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: tutorAgent.endpoint, api_key: tutorAgent.api_key }),
            });
            const testData = await res.json();
            const actualStatus = testData.success ? 'online' : 'offline';
            
            setAgentStatus(actualStatus);
            if (tutorAgent.status !== actualStatus) {
              await updateExternalAgent(tutorAgent.id, { status: actualStatus });
            }
          } catch (pingErr) {
            console.error('Error checking actual status of agent:', pingErr);
            setAgentStatus('offline');
            if (tutorAgent.status !== 'offline') {
              await updateExternalAgent(tutorAgent.id, { status: 'offline' });
            }
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
  }, [agentStatus, agentId, isResourceUrlLoading, hasCheckedInit, supabaseResourceUrl, course, slug, messages, isUpdated, currentCardIndex]);



  useEffect(() => {
    console.log('[LearnClient] Card index changed:', {
      currentIndex: currentCardIndex,
      cardTitle: cards[currentCardIndex]?.title || 'Untitled',
      hasMdx: !!cards[currentCardIndex]?.mdxSource
    });

    // Update progress in DB (non-blocking)
    const updateProgress = async () => {
      if (!course?.id) return;
      try {
        await fetch('/api/courses/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: course.id,
            last_card: currentCardIndex + 1,
            completed: currentCardIndex === totalCards - 1
          })
        });
      } catch (err) {
        console.error('Failed to update progress in DB:', err);
      }
    };
    updateProgress();
  }, [currentCardIndex, cards, course, totalCards]);

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

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
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
            content: '온라인 상태의 외부 에이전트가 없습니다. 우측 상단 닉네임 클릭 -> 설정 -> 에이전트 관리에서 에이전트를 먼저 등록하고 활성화해주세요.'
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
        content: isCheckpointTrigger ? '체크포인트 질문을 생성하는 중...' : '답변을 생성하는 중...' 
      }]);
    }

    try {
      const defaultResourceUrl = `${window.location.origin}/api/courses/${encodeURIComponent(slug)}/resource`;
      const finalResourceUrl = supabaseResourceUrl && supabaseResourceUrl.includes('.supabase.co')
        ? supabaseResourceUrl
        : defaultResourceUrl;

      const isFallback = !finalResourceUrl.includes('.supabase.co');
      const isFirstQuestion = newMessages.filter(m => m.role === 'user').length === 1;

      let fallbackTocText = '';
      if (isFallback && isFirstQuestion) {
        const tocItems = course.toc || [];
        const tocTreeText = generateFallbackTocText(tocItems, 0);
        fallbackTocText = `\n\n[Fallback Course Table of Contents]\n${tocTreeText}\n\nNote: The resource URL could not be loaded via external storage. Please refer to this Table of Contents to understand the overall course structure.`;
      }

      let systemPrompt = `You are a helpful AI tutor for the course "${course.title}". 
To minimize context payload, detailed course contents (summaries, chapters, and all card contents) are not sent directly in the chat messages.
Instead, you must download the complete course materials from the following URL into a course-specific directory in your workspace (e.g. "courses/${slug}") if you don't already have them:
${finalResourceUrl}
 
If you have already downloaded/cached the course materials from this URL previously, DO NOT download them again.

Additionally, you MUST communicate the status of the course materials download back to the system using a special format called a "Hidden Message".
Whenever you respond (especially on the first system check or after download completes), append the following HTML comment at the end of your response:
<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": true} -->
Use "downloaded": true if the materials are successfully downloaded/extracted and analyzed in your workspace, otherwise use "downloaded": false.
 
Please guide the student using the current card context provided in the user's message.${fallbackTocText}`;

      if (isCheckpointMode && activeCheckpoint) {
        systemPrompt += `

[Active Checkpoint QnA Evaluation]
The student is currently undergoing a checkpoint QnA for the card "${cards[currentCardIndex]?.title}".
The evaluation instruction is:
"${activeCheckpoint.prompt}"

You must evaluate the student's response.
If the student's response satisfies the criteria, respond with praise and details, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": true} -->

If the student's response does NOT satisfy the criteria, explain why and encourage them to try again, and you MUST append the following exact HTML comment at the very end of your response:
<!-- HIDDEN_MESSAGE: {"action": "checkpoint_evaluation", "passed": false} -->`;
      }

      const currentCard = cards[currentCardIndex];
      const currentCardContext = `[Current Card Context]
Card Title: ${currentCard?.title || 'Untitled'}
Card Content:
${currentCard?.content || ''}
--------------------------------------------------
Student Question: `;

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

        // Prepend current card context to the user's question
        if (apiMessages.length > 0 && apiMessages[apiMessages.length - 1].role === 'user' && !isCheckpointTrigger) {
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

  const handleSend = () => {
    if (!input.trim()) return;
    const userPrompt = input.trim();
    setInput('');
    sendMessage(userPrompt, messages);
  };

  return (
    <div className="no-layout-padding flex h-full w-full overflow-hidden">
      {/* Course TOC Panel */}
      <div className="w-64 border-r bg-background flex flex-col h-full shrink-0 min-h-0">
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
                        : isUnlocked 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-muted text-muted-foreground/40 border-transparent"
                    )}>
                      {isUnlocked && !isActive ? (
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
                    filenameToIndexMap={filenameToIndexMap}
                    maxUnlockedIndex={isPreview ? totalCards - 1 : maxUnlockedIndex}
                    currentCardIndex={currentCardIndex}
                    activeFilename={cards[currentCardIndex]?.filename}
                    onSelectCard={(index) => handleSelectCard(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden border-r">
        <header className="h-16 px-6 flex items-center justify-between border-b shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">Card {currentCardIndex + 1}</span>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {course.title}
              {isPreview && (
                <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs py-0.5 px-2 animate-pulse">
                  미리보기 모드
                </Badge>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon"><Bookmark className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon"><Share2 className="w-4 h-4" /></Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-full mx-auto pb-6">
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <h2 className="text-2xl font-bold mb-4">
                {cards[currentCardIndex]?.title || `학습 콘텐츠 (카드 ${currentCardIndex + 1})`}
              </h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground space-y-4">
                {cards[currentCardIndex]?.mdxSource ? (
                  <MDXRemote {...cards[currentCardIndex].mdxSource} components={mdxComponents} />
                ) : (
                  <div className="whitespace-pre-wrap">{cards[currentCardIndex]?.content || '콘텐츠가 없습니다.'}</div>
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

      {/* AI Agent Chat Area */}
      <aside className="w-[400px] shrink-0 bg-muted/10 flex flex-col h-full shadow-lg z-10 overflow-hidden min-h-0">
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
          <div>
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
        </div>

        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-muted">
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
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
              </div>
            ))}
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
                  handleSend();
                }
              }}
              placeholder="질문을 입력하세요..."
              className="resize-none pr-12 h-20 bg-muted/50 focus-visible:ring-primary"
            />
            <Button 
              size="icon" 
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {agentStatus === 'none' ? (
              <span className="cursor-pointer text-primary hover:underline" onClick={() => router.push('/settings')}>
                에이전트가 연동되지 않았습니다. 설정으로 이동하기
              </span>
            ) : (
              "UserExternalAgent API와 연동되어 답변을 생성합니다."
            )}
          </p>
        </div>
      </aside>

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
