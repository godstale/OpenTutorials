import { connection } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

async function getAgentForProxy(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: agent, error } = await supabase
    .from('user_external_agents')
    .select('dashboard_api_url, dashboard_session_token')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !agent) {
    return { error: NextResponse.json({ error: 'Agent not found' }, { status: 404 }) };
  }

  if (!agent.dashboard_api_url) {
    return {
      error: NextResponse.json({ error: 'Dashboard API not configured' }, { status: 404 }),
    };
  }

  // Normalize trailing slash to prevent double slashes in URL construction
  agent.dashboard_api_url = agent.dashboard_api_url.replace(/\/$/, '');

  return { agent };
}

function buildHeaders(token: string | null | undefined, method: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['X-Hermes-Session-Token'] = token;
  }
  return headers;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  await connection();
  const { id, path } = await params;

  const resolved = await getAgentForProxy(id);
  if (resolved.error) return resolved.error;

  const { agent } = resolved;
  const targetPath = path.join('/');
  const targetUrl = `${agent!.dashboard_api_url}/${targetPath}`;
  const headers = buildHeaders(agent!.dashboard_session_token, 'GET');

  try {
    const response = await fetch(targetUrl, { method: 'GET', headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect to Dashboard API' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, path } = await params;

  const resolved = await getAgentForProxy(id);
  if (resolved.error) return resolved.error;

  const { agent } = resolved;
  const targetPath = path.join('/');
  const targetUrl = `${agent!.dashboard_api_url}/${targetPath}`;
  const headers = buildHeaders(agent!.dashboard_session_token, 'POST');

  let body: string | undefined;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    body = undefined;
  }

  try {
    const response = await fetch(targetUrl, { method: 'POST', headers, body });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect to Dashboard API' },
      { status: 502 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, path } = await params;

  const resolved = await getAgentForProxy(id);
  if (resolved.error) return resolved.error;

  const { agent } = resolved;
  const targetPath = path.join('/');
  const targetUrl = `${agent!.dashboard_api_url}/${targetPath}`;
  const headers = buildHeaders(agent!.dashboard_session_token, 'PUT');

  let body: string | undefined;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    body = undefined;
  }

  try {
    const response = await fetch(targetUrl, { method: 'PUT', headers, body });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect to Dashboard API' },
      { status: 502 }
    );
  }
}
