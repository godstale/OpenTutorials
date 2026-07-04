'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutGrid, Calendar, Clock, RefreshCw, 
  CheckCircle2, XCircle, ShieldAlert, Settings, Edit3, Save, X, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { updateExternalAgent } from '@/lib/api/external-agents';
import type { UserExternalAgent } from '@/lib/types';
import { cn } from '@/lib/utils';
import AITutorProgressOverlay from '@/components/features/AITutorProgressOverlay';

interface AgentSettingsTabProps {
  agent: UserExternalAgent;
}

interface ModelItem {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export default function AgentSettingsTab({ agent }: AgentSettingsTabProps) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [endpoint, setEndpoint] = useState(agent.endpoint);
  const [apiKey, setApiKey] = useState('');
  const [webUiUrl, setWebUiUrl] = useState(agent.web_ui_url || '');
  const [dashboardApiUrl, setDashboardApiUrl] = useState(agent.dashboard_api_url || '');
  const [dashboardSessionToken, setDashboardSessionToken] = useState('');
  const [isAiTutor, setIsAiTutor] = useState(agent.is_ai_tutor || false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDashboardToken, setShowDashboardToken] = useState(false);
  const [isTutorSetupProgressOpen, setIsTutorSetupProgressOpen] = useState(false);

  // Dashboard API connection test state
  const [dashboardTestStatus, setDashboardTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [dashboardTestMessage, setDashboardTestMessage] = useState<string | null>(null);

  // Models list state
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: agent.endpoint, api_key: agent.api_key }),
      });
      const data = await res.json();
      if (isMountedRef.current) {
        if (data.success) {
          setModels(data.models || []);
        } else {
          setModelsError(data.error || '에이전트 서버로부터 모델 정보를 조회하지 못했습니다.');
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setModelsError(err instanceof Error ? err.message : '네트워크 통신 중 오류가 발생했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingModels(false);
      }
    }
  }, [agent.endpoint, agent.api_key]);

  // Fetch models automatically when component mounts
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const [isUpdatingModel, setIsUpdatingModel] = useState(false);

  const handleSelectModel = async (modelId: string) => {
    if (isUpdatingModel) return;
    setIsUpdatingModel(true);
    try {
      await updateExternalAgent(agent.id, { selected_model: modelId });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '모델 변경에 실패했습니다.');
    } finally {
      setIsUpdatingModel(false);
    }
  };

  const activeModel = agent.selected_model || 'hermes-agent';

  const handleDashboardTest = async () => {
    setDashboardTestStatus('testing');
    setDashboardTestMessage(null);
    try {
      const res = await fetch(`/api/external-agents/${agent.id}/dashboard/api/status`);
      if (res.ok) {
        setDashboardTestStatus('success');
        setDashboardTestMessage('Dashboard API 연결 성공');
      } else {
        const data = await res.json().catch(() => ({}));
        setDashboardTestStatus('error');
        setDashboardTestMessage(data.error || `연결 실패 (HTTP ${res.status})`);
      }
    } catch (err) {
      setDashboardTestStatus('error');
      setDashboardTestMessage(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let isTutorConfigured = agent.is_tutor_configured || false;
      // AI 튜터용 에이전트로 새로 설정하거나, 설정되어 있으나 미완료된 경우 에이전트의 soul.md 설정을 위해 프롬프트 자동 전달
      if (isAiTutor && (!agent.is_ai_tutor || !agent.is_tutor_configured)) {
        setIsTutorSetupProgressOpen(true);
        const setupPrompt = `You are an autonomous AI agent. You have been registered as the official AI Tutor for the PennyPress SaaS platform. To function correctly, you must update your active profile's \`soul.md\` (or \`SOUL.md\`) configuration file to match the PennyPress AI Tutor persona.
Please write/overwrite your \`soul.md\` (or \`SOUL.md\`) file with the following Markdown content:
"""
# PennyPress AI Tutor Persona
You are a highly capable and friendly AI Tutor designed to help users master their registered courses on the PennyPress platform.
Your primary role is to guide students, answer their course-specific questions, and verify their learning progress.

Key guidelines:
1. **Be supportive and clear**: Explain complex topics simply using visual descriptions or clear structures.
2. **Context-aware instruction**: Guide the user based on the current card context and course materials downloaded in your workspace directory (e.g. \`courses/<slug>\`).
3. **Background Communication (Hidden Message)**: You must communicate the course download/analysis status to the PennyPress front-end using:
   \`<!-- HIDDEN_MESSAGE: {"action": "download_status", "downloaded": true} -->\`
"""
Please confirm the success of the update, starting with: "SUCCESS: Soul configuration updated."`;

        const resolvedEndpoint = endpoint.replace('//localhost', '//127.0.0.1');
        const cleanEndpoint = resolvedEndpoint.replace(/\/$/, '');
        const v1Url = cleanEndpoint.endsWith('/v1') ? cleanEndpoint : `${cleanEndpoint}/v1`;

        const chatRes = await fetch('/api/external-agents/setup-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: v1Url, api_key: apiKey.trim() || agent.api_key, prompt: setupPrompt }),
        });

        const chatData = await chatRes.json();
        if (!chatData.success) {
          throw new Error(`AI 튜터 설정 실패: ${chatData.error || '응답이 올바르지 않습니다.'}`);
        }
        isTutorConfigured = chatData.isConfigured === true;
      } else if (!isAiTutor) {
        isTutorConfigured = false;
      }

      const updates: Partial<Omit<UserExternalAgent, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
        name,
        endpoint,
        web_ui_url: webUiUrl.trim() || undefined,
        dashboard_api_url: dashboardApiUrl.trim() || undefined,
        is_ai_tutor: isAiTutor,
        is_tutor_configured: isTutorConfigured,
      };

      if (apiKey.trim()) {
        updates.api_key = apiKey.trim();
      }

      if (dashboardSessionToken.trim()) {
        updates.dashboard_session_token = dashboardSessionToken.trim();
      }

      await updateExternalAgent(agent.id, updates);
      if (isMountedRef.current) {
        setIsEditing(false);
      }
      // Refresh the page data to update parent component state
      window.location.reload();
    } catch (err) {
      if (isMountedRef.current) {
        setSaveError(err instanceof Error ? err.message : '에이전트 정보 수정에 실패했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      setIsTutorSetupProgressOpen(false);
    }
  };

  const handleCancel = () => {
    setName(agent.name);
    setEndpoint(agent.endpoint);
    setApiKey('');
    setWebUiUrl(agent.web_ui_url || '');
    setDashboardApiUrl(agent.dashboard_api_url || '');
    setDashboardSessionToken('');
    setIsAiTutor(agent.is_ai_tutor || false);
    setSaveError(null);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Basic Configuration Card */}
      <Card className="md:col-span-2 border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-4 px-6">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              에이전트 정보 설정
            </CardTitle>
            <CardDescription className="text-xs">원격 에이전트 인스턴스의 연동 설정을 편집합니다.</CardDescription>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5 active:scale-95 transition-all">
              <Edit3 className="size-3.5" />
              정보 수정
            </Button>
          )}
        </CardHeader>
        
        <form onSubmit={handleSave}>
          <CardContent className="p-6 space-y-5">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-xs font-bold">에이전트 이름 *</Label>
                  <Input 
                    id="agent-name" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="예: My Local Hermes"
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agent-endpoint" className="text-xs font-bold">API Endpoint URL *</Label>
                  <Input 
                    id="agent-endpoint" 
                    required 
                    value={endpoint} 
                    onChange={(e) => setEndpoint(e.target.value)} 
                    placeholder="예: http://127.0.0.1:8642/v1"
                    className="bg-white dark:bg-zinc-900 font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agent-apikey" className="text-xs font-bold">API Server Key (새로운 키 입력 시에만 변경됨)</Label>
                  <div className="relative">
                    <Input 
                      id="agent-apikey" 
                      type={showApiKey ? "text" : "password"} 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder="비워두면 기존 키를 유지합니다"
                      className="bg-white dark:bg-zinc-900 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agent-webui" className="text-xs font-bold">Web UI / Kanban Board URL (선택)</Label>
                  <Input
                    id="agent-webui"
                    value={webUiUrl}
                    onChange={(e) => setWebUiUrl(e.target.value)}
                    placeholder="예: http://127.0.0.1:3000"
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-zinc-50/20 dark:bg-zinc-900/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="agent-aitutor" className="text-sm font-bold">AI 튜터(강좌 학습)용 에이전트로 설정</Label>
                    <p className="text-xs text-muted-foreground">이 에이전트를 강좌 학습 화면에서 개인 AI 튜터로 활성화합니다. (유저당 1개만 지정 가능)</p>
                  </div>
                  <Switch
                    id="agent-aitutor"
                    checked={isAiTutor}
                    onCheckedChange={(checked) => setIsAiTutor(checked)}
                  />
                </div>

                {/* Dashboard API Settings */}
                <div className="pt-2 pb-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Dashboard API 설정</span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-dashboard-url" className="text-xs font-bold">Dashboard API URL (선택)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="agent-dashboard-url"
                      value={dashboardApiUrl}
                      onChange={(e) => setDashboardApiUrl(e.target.value)}
                      placeholder="예: http://myserver:9120"
                      className="bg-white dark:bg-zinc-900 font-mono flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDashboardTest}
                      disabled={dashboardTestStatus === 'testing' || !agent.dashboard_api_url}
                      className="shrink-0 gap-1.5 active:scale-95 transition-all"
                      title={!agent.dashboard_api_url ? '저장 후 테스트할 수 있습니다' : '연결 테스트'}
                    >
                      {dashboardTestStatus === 'testing' ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      연결 테스트
                    </Button>
                  </div>
                  {dashboardTestStatus !== 'idle' && dashboardTestMessage && (
                    <p className={`text-xs font-medium flex items-center gap-1 ${dashboardTestStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {dashboardTestStatus === 'success' ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0" />
                      )}
                      {dashboardTestMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-dashboard-token" className="text-xs font-bold">Dashboard Session Token (새로운 토큰 입력 시에만 변경됨)</Label>
                  <div className="relative">
                    <Input
                      id="agent-dashboard-token"
                      type={showDashboardToken ? "text" : "password"}
                      value={dashboardSessionToken}
                      onChange={(e) => setDashboardSessionToken(e.target.value)}
                      placeholder="비워두면 기존 토큰을 유지합니다"
                      className="bg-white dark:bg-zinc-900 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDashboardToken(!showDashboardToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showDashboardToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 text-xs text-red-500 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <XCircle className="size-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">에이전트명</span>
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">AI 튜터 지정 여부</span>
                  <div className="flex items-center gap-2">
                    {agent.is_ai_tutor ? (
                      <>
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">지정됨</Badge>
                        {agent.is_tutor_configured ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-500/5">지침 설정 완료</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/20 bg-amber-500/5">지침 설정 대기</Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">미지정</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">활성 모델</span>
                  <span className="text-sm font-mono font-semibold text-primary">
                    {agent.selected_model || 'hermes-agent'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">API Endpoint URL</span>
                  <span className="text-sm font-mono text-foreground break-all sm:text-right">{agent.endpoint}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">API 인증 키 여부</span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {agent.api_key ? '********' : '없음'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">Web UI / Kanban URL</span>
                  <span className="text-sm font-mono text-foreground break-all sm:text-right">
                    {agent.web_ui_url || '미지정'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">Dashboard API URL</span>
                  <span className="text-sm font-mono text-foreground break-all sm:text-right">
                    {agent.dashboard_api_url || '미설정'}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">Dashboard 세션 토큰</span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {agent.dashboard_session_token ? '●●●●●●●●' : '없음'}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">등록 일시</span>
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {new Date(agent.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">최근 정보 수정</span>
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {new Date(agent.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          
          {isEditing && (
            <CardFooter className="border-t border-border/60 bg-zinc-50/30 dark:bg-zinc-900/30 p-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5">
                <X className="size-4" />
                취소
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5 shadow active:scale-95 transition-all">
                <Save className="size-4" />
                변경사항 저장
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Model Inquiry Card */}
      <Card className="border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <LayoutGrid className="size-4.5 text-primary" />
              지원 모델 조회
            </CardTitle>
            <CardDescription className="text-[10px]">연결된 Hermes Agent의 지원 LLM 목록입니다.</CardDescription>
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={fetchModels} 
            disabled={isLoadingModels}
            className="size-8 rounded-lg active:scale-95 transition-all"
            title="모델 정보 갱신"
          >
            <RefreshCw className={`size-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoadingModels ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground animate-pulse">원격 서버 정보 조회 중...</span>
            </div>
          ) : modelsError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-4 space-y-2 shadow-sm text-center">
              <p className="text-xs text-destructive font-semibold flex items-center justify-center gap-1.5">
                <ShieldAlert className="size-4" />
                조회 실패
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">{modelsError}</p>
              <Button size="sm" variant="outline" onClick={fetchModels} className="mt-1 h-7 text-xs">
                다시 시도
              </Button>
            </div>
          ) : models.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <LayoutGrid className="size-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs">조회된 모델 정보가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">지원하는 에이전트 모델 ({models.length})</p>
              <div className="flex flex-wrap gap-2">
                {models.map((model) => {
                  const isActive = model.id === activeModel;
                  return (
                    <Badge 
                      key={model.id} 
                      variant={isActive ? 'default' : 'secondary'}
                      onClick={() => !isActive && !isUpdatingModel && handleSelectModel(model.id)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold font-mono border transition-colors flex items-center gap-1 select-none",
                        isActive 
                          ? "bg-primary border-primary text-primary-foreground cursor-default" 
                          : cn(
                              "bg-zinc-100/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-border/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer hover:border-primary/50",
                              isUpdatingModel && "opacity-50 cursor-not-allowed"
                            )
                      )}
                    >
                      {isActive && <CheckCircle2 className="size-3 shrink-0" />}
                      {model.id}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>API 호출이 원활하게 작동 중입니다.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AITutorProgressOverlay isOpen={isTutorSetupProgressOpen} />
    </div>
  );
}
