import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Force IPv4 loopback (127.0.0.1) instead of localhost to bypass Node.js IPv6 (::1) preference
    const resolvedEndpoint = agent.endpoint.replace('//localhost', '//127.0.0.1');
    const cleanEndpoint = resolvedEndpoint.replace(/\/$/, '');
    const v1Url = cleanEndpoint.endsWith('/v1') ? cleanEndpoint : `${cleanEndpoint}/v1`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (agent.api_key) {
      headers['Authorization'] = `Bearer ${agent.api_key}`;
    }

    // Use the model configured in the database, fallback to 'hermes-agent'
    const targetModel = agent.selected_model || 'hermes-agent';

    const response = await fetch(`${v1Url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages,
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
