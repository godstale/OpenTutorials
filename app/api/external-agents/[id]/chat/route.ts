import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';

// Next.js Route Handler execution settings
export const maxDuration = 300; // 5 minutes execution limit (Vercel Pro maximum)
export const dynamic = 'force-dynamic';

function estimateTokenSize(text: string): number {
  if (!text) return 0;
  const koreanCharCount = (text.match(/[\uac00-\ud7a3]/g) || []).length;
  const otherCharCount = text.length - koreanCharCount;
  return Math.ceil(koreanCharCount * 1.5 + otherCharCount * 0.5);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let agentIdForLog = '';
  try {
    const { id } = await params;
    agentIdForLog = id;
    const { messages, original_user_message } = await req.json();

    console.log(`[API CHAT LOG] [${id}] ===== Chat Request Started =====`);
    console.log(`[API CHAT LOG] [${id}] Input messages count: ${messages?.length || 0}`);

    // Client abort connection listener
    req.signal.addEventListener('abort', () => {
      console.warn(`[API CHAT LOG] [${id}] CLIENT ABORTED CONNECTION (elapsed: ${Date.now() - startTime}ms)`);
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error(`[API CHAT LOG] [${id}] Unauthorized user access attempt`);
      return new Response('Unauthorized', { status: 401 });
    }

    // Fetch external agent credentials and verify owner
    const { data: agent, error } = await supabase
      .from('user_external_agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !agent) {
      console.error(`[API CHAT LOG] [${id}] Agent not found or access denied. Error:`, error);
      return new Response('Agent not found or access denied', { status: 404 });
    }

    console.log(`[API CHAT LOG] [${id}] Agent info loaded: type=${agent.agent_type}, endpoint=${agent.endpoint}, selected_model=${agent.selected_model}`);

    // Get last user message to store in DB
    const lastUserMessage = messages[messages.length - 1];
    const userContent = original_user_message || lastUserMessage?.content || '';
    const isSystemCheck = userContent.includes('[시스템 점검]');

    if (lastUserMessage && lastUserMessage.role === 'user' && !isSystemCheck) {
      const displayMsg = userContent;
      console.log(`[API CHAT LOG] [${id}] Saving user message to DB: "${displayMsg.slice(0, 60)}${displayMsg.length > 60 ? '...' : ''}"`);
      await supabase
        .from('user_external_agent_messages')
        .insert({
          agent_id: id,
          role: 'user',
          content: userContent,
        });
    }

    // Load accumulated messages from the database for LLM agent type session maintenance
    let requestMessages = messages;
    if (agent.agent_type === 'llm') {
      console.log(`[API CHAT LOG] [${id}] Agent type is LLM. Fetching accumulated messages from DB...`);
      const { data: dbMessages } = await supabase
        .from('user_external_agent_messages')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: true });

      const systemMsg = messages.find((m: { role: string; content: string }) => m.role === 'system');
      const tempMessages = [];
      if (systemMsg) {
        tempMessages.push({ role: 'system', content: systemMsg.content });
      }

      if (dbMessages && dbMessages.length > 0) {
        console.log(`[API CHAT LOG] [${id}] Found ${dbMessages.length} past messages in DB`);
        dbMessages.forEach((msg: { role: string; content: string }) => {
          tempMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        });
        requestMessages = tempMessages;
      } else {
        console.log(`[API CHAT LOG] [${id}] No past messages found in DB`);
      }
    }

    const { v1Url } = normalizeAgentEndpoint(agent.endpoint);
    const targetModel = agent.selected_model || (agent.agent_type === 'harness' ? 'hermes-agent' : '');
    if (!targetModel) {
      console.warn(`[API CHAT LOG] [${id}] Model not selected`);
      return new Response('모델이 선택되지 않았습니다. 에이전트 상세 설정에서 모델을 설정해 주세요.', { status: 400 });
    }

    let targetUrl = `${v1Url}/chat/completions`;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let bodyObj: any = {
      model: targetModel,
      messages: requestMessages,
      stream: true,
    };

    if (agent.agent_program === 'claude') {
      targetUrl = `${agent.endpoint}/messages`;
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': agent.api_key || '',
        'anthropic-version': '2023-06-01',
      };
      
      const systemMessage = requestMessages.find((m: any) => m.role === 'system')?.content;
      const otherMessages = requestMessages.filter((m: any) => m.role !== 'system');
      
      bodyObj = {
        model: targetModel,
        messages: otherMessages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        max_tokens: 4000,
        stream: true,
      };
      if (systemMessage) {
        bodyObj.system = systemMessage;
      }
    } else if (agent.agent_program === 'gemini') {
      // Use Google Gemini's OpenAI compatible endpoints
      targetUrl = `${agent.endpoint}/openai/v1/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key || ''}`,
      };
    } else {
      // Standard OpenAI or OpenAI compatible APIs
      if (agent.api_key) {
        headers['Authorization'] = `Bearer ${agent.api_key}`;
      }
    }

    console.log(`[API CHAT LOG] [${id}] Connecting to LLM server: ${targetUrl}`);
    console.log(`[API CHAT LOG] [${id}] Request payload: model="${targetModel}", messagesCount=${requestMessages.length}`);

    const fetchStartTime = Date.now();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj),
      signal: req.signal,
    });

    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`[API CHAT LOG] [${id}] LLM Response Headers Received. Status: ${response.status} ${response.statusText} (Took ${fetchDuration}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API CHAT LOG] [${id}] LLM server returned error status. Body:`, errorText);
      return new Response(`External Agent API error: ${errorText}`, { status: response.status });
    }

    const rawStream = response.body;
    if (!rawStream) {
      console.error(`[API CHAT LOG] [${id}] Response body is null`);
      return new Response('Empty response body', { status: 500 });
    }

    // Wrap downstream stream to capture assistant reply content
    const reader = rawStream.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const isClaude = agent.agent_program === 'claude';
    let assistantText = '';
    let buffer = '';
    let isFirstChunk = true;
    let chunkCount = 0;

    const transformStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (isFirstChunk && !done) {
              isFirstChunk = false;
              const ttft = Date.now() - startTime;
              console.log(`[API CHAT LOG] [${id}] First Chunk Received. Time-To-First-Token (TTFT): ${ttft}ms`);
            }

            if (done) {
              const totalDuration = Date.now() - startTime;
              console.log(`[API CHAT LOG] [${id}] Stream reading complete. Total elapsed time: ${totalDuration}ms, Total chunks: ${chunkCount}, Total generated chars: ${assistantText.length}`);
              
              if (buffer.trim()) {
                processLine(buffer.trim());
              }
              
              // Save assistant message to Database on complete
              if (assistantText.trim() && !isSystemCheck) {
                console.log(`[API CHAT LOG] [${id}] Saving assistant response to DB: "${assistantText.slice(0, 60)}${assistantText.length > 60 ? '...' : ''}"`);
                await supabase
                  .from('user_external_agent_messages')
                  .insert({
                    agent_id: id,
                    role: 'assistant',
                    content: assistantText,
                  });
                
                // Call RPC function to prune to latest 100 messages
                console.log(`[API CHAT LOG] [${id}] Pruning external agent messages...`);
                await supabase.rpc('prune_external_agent_messages', { p_agent_id: id });

                // 에이전트별 대화 기록 누적 저장 (파일)
                try {
                  const durationMs = Date.now() - startTime;
                  const userContent = original_user_message || lastUserMessage?.content || '';
                  const inputTokenSize = estimateTokenSize(userContent);
                  const outputTokenSize = estimateTokenSize(assistantText);

                  const chatLogDir = path.join(process.cwd(), 'public', 'agent-chats');
                  if (!fs.existsSync(chatLogDir)) {
                    fs.mkdirSync(chatLogDir, { recursive: true });
                  }

                  const chatLogPath = path.join(chatLogDir, `${id}.json`);
                  let chatLogs = [];
                  if (fs.existsSync(chatLogPath)) {
                    try {
                      const fileData = fs.readFileSync(chatLogPath, 'utf8');
                      chatLogs = JSON.parse(fileData);
                    } catch (e) {
                      console.error(`[API CHAT LOG] [${id}] Failed to parse existing chat log file, starting fresh:`, e);
                    }
                  }

                  chatLogs.push({
                    timestamp: new Date().toISOString(),
                    duration_ms: durationMs,
                    input_token_size: inputTokenSize,
                    output_token_size: outputTokenSize,
                    user_message: userContent,
                    assistant_message: assistantText,
                  });

                  fs.writeFileSync(chatLogPath, JSON.stringify(chatLogs, null, 2), 'utf8');
                  console.log(`[API CHAT LOG] [${id}] Successfully wrote log to public/agent-chats/${id}.json`);
                } catch (fileErr) {
                  console.error(`[API CHAT LOG] [${id}] Failed to write chat log to file:`, fileErr);
                }
              } else {
                console.warn(`[API CHAT LOG] [${id}] Assistant generated empty text. No DB save/file log.`);
              }

              controller.close();
              break;
            }

            chunkCount++;

            // Decode chunk value and process line-by-line for conversion if necessary
            const decodedChunk = decoder.decode(value, { stream: true });
            buffer += decodedChunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine) continue;

              if (isClaude) {
                // Translate Anthropic message SSE to OpenAI chat completion chunk SSE
                if (cleanLine.startsWith('data:')) {
                  const dataStr = cleanLine.slice(cleanLine.indexOf(':') + 1).trim();
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                      const text = parsed.delta.text;
                      assistantText += text;

                      // Construct OpenAI structure delta
                      const openAiChunk = {
                        choices: [{
                          delta: { content: text }
                        }]
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
                    } else if (parsed.type === 'message_stop') {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    }
                  } catch {}
                }
              } else {
                // OpenAI compatible stream (Gemini OpenAI mode, DeepSeek, Qwen, Kimi, Ollama, LM Studio)
                processLine(cleanLine);
                controller.enqueue(encoder.encode(line + '\n'));
              }
            }
          }
        } catch (err) {
          console.error(`[API CHAT LOG] [${id}] Stream read error occurred:`, err);
          controller.error(err);
        }

        function processLine(line: string) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data:')) {
            const dataStr = cleanLine.slice(cleanLine.indexOf(':') + 1).trim();
            if (dataStr === '[DONE]') return;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              assistantText += delta;
            } catch {}
          }
        }
      }
    });

    console.log(`[API CHAT LOG] [${id}] Returning Streaming Response to browser...`);
    return new Response(transformStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[API CHAT LOG] [${agentIdForLog || 'unknown'}] Exception in POST handler:`, err);
    return new Response(errMsg, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const { data: agent, error } = await supabase
      .from('user_external_agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 404 });
    }

    const chatLogDir = path.join(process.cwd(), 'public', 'agent-chats');
    const chatLogPath = path.join(chatLogDir, `${id}.json`);

    let chatLogs = [];
    if (fs.existsSync(chatLogPath)) {
      try {
        const fileData = fs.readFileSync(chatLogPath, 'utf8');
        chatLogs = JSON.parse(fileData);
      } catch (e) {
        console.error('Failed to parse chat log file:', e);
      }
    }

    return NextResponse.json(chatLogs);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

