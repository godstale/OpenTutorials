import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';


export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, api_key, prompt } = await req.json();

    if (!endpoint || !prompt) {
      return NextResponse.json({ error: 'Endpoint and prompt are required' }, { status: 400 });
    }

    const { v1Url } = normalizeAgentEndpoint(endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (api_key) {
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    // Call /chat/completions of the external agent
    const chatResponse = await fetch(`${v1Url}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: false
      }),
      signal: AbortSignal.timeout(30000), // Give it 30s as writing files can take some time
    }).catch((err) => {
      console.error('[setup-tutor] fetch error:', err);
      return null;
    });

    if (!chatResponse) {
      return NextResponse.json({ 
        success: false, 
        error: '에이전트 서버의 응답이 없거나 연결할 수 없습니다.' 
      }, { status: 200 });
    }

    if (!chatResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `에이전트 서버 오류 응답: HTTP ${chatResponse.status}` 
      }, { status: 200 });
    }

    const chatData = await chatResponse.json();
    const responseText = chatData.choices?.[0]?.message?.content || '';

    // Check if the response contains the success confirmation
    const isSuccess = responseText.toLowerCase().includes('success');

    return NextResponse.json({
      success: true,
      isConfigured: isSuccess,
      response: responseText
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
