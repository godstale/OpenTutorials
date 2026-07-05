import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';



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
  try {
    const startTime = Date.now();
    const { id } = await params;
    const { messages, original_user_message } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
      return new Response('Agent not found or access denied', { status: 404 });
    }

    // Get last user message to store in DB
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await supabase
        .from('user_external_agent_messages')
        .insert({
          agent_id: id,
          role: 'user',
          content: original_user_message || lastUserMessage.content,
        });
    }

    // Load accumulated messages from the database for LLM agent type session maintenance
    let requestMessages = messages;
    if (agent.agent_type === 'llm') {
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
        dbMessages.forEach((msg: { role: string; content: string }) => {
          tempMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        });
        requestMessages = tempMessages;
      }
    }

    const { v1Url } = normalizeAgentEndpoint(agent.endpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (agent.api_key) {
      headers['Authorization'] = `Bearer ${agent.api_key}`;
    }

    const targetModel = agent.selected_model || (agent.agent_type === 'harness' ? 'hermes-agent' : '');
    if (!targetModel) {
      return new Response('모델이 선택되지 않았습니다. 에이전트 상세 설정에서 모델을 설정해 주세요.', { status: 400 });
    }

    const response = await fetch(`${v1Url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: requestMessages,
        stream: true,
      }),
      signal: req.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`External Agent API error: ${errorText}`, { status: response.status });
    }

    const rawStream = response.body;
    if (!rawStream) {
      return new Response('Empty response body', { status: 500 });
    }

    // Wrap downstream stream to capture assistant reply content
    const reader = rawStream.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let buffer = '';

    const transformStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // If there's leftover buffer content, process it
              if (buffer.trim()) {
                processLine(buffer.trim());
              }
              
              // Save assistant message to Database on complete
              if (assistantText.trim()) {
                await supabase
                  .from('user_external_agent_messages')
                  .insert({
                    agent_id: id,
                    role: 'assistant',
                    content: assistantText,
                  });
                
                // Call RPC function to prune to latest 100 messages
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
                      console.error('Failed to parse existing chat log file, starting fresh:', e);
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
                } catch (fileErr) {
                  console.error('Failed to write chat log to file:', fileErr);
                }
              }

              controller.close();
              break;
            }

            // Forward chunks straight to browser client so user sees response instantly
            controller.enqueue(value);

            // Accumulate chunk string
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
              processLine(line);
            }
          }
        } catch (err) {
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

