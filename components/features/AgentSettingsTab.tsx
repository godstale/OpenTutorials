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
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [agentType, setAgentType] = useState<'harness' | 'llm'>(agent.agent_type || 'harness');
  const [selectedModel, setSelectedModel] = useState<string>(agent.selected_model || 'hermes-agent');
  const [envType, setEnvType] = useState<'local' | 'cloud'>(agent.env_type || 'local');
  const [agentProgram, setAgentProgram] = useState<'hermes' | 'openclaw' | 'ollama' | 'lmstudio'>(agent.agent_program || 'hermes');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

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


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updates: Partial<Omit<UserExternalAgent, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
        name,
        endpoint,
        agent_type: agentType,
        selected_model: selectedModel,
        env_type: envType,
        agent_program: agentProgram,
      };

      if (apiKey.trim()) {
        updates.api_key = apiKey.trim();
      }

      await updateExternalAgent(agent.id, updates);
      if (isMountedRef.current) {
        setIsEditing(false);
      }
      window.location.reload();
    } catch (err) {
      if (isMountedRef.current) {
        setSaveError(err instanceof Error ? err.message : '에이전트 정보 수정에 실패했습니다.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setName(agent.name);
    setEndpoint(agent.endpoint);
    setApiKey('');
    setAgentType(agent.agent_type || 'harness');
    setSelectedModel(agent.selected_model || 'hermes-agent');
    setEnvType(agent.env_type || 'local');
    setAgentProgram(agent.agent_program || 'hermes');
    setSaveError(null);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Basic Configuration Card */}
      <Card className="md:col-span-2 border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between py-3 px-6">
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
          <CardContent className="py-4 px-6 space-y-4">
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
                  <Label className="text-xs font-bold">에이전트 타입 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAgentType('harness')}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        agentType === 'harness'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">하네스 에이전트</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Hermes, Open claw와 같은 에이전트 프로그램</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentType('llm')}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        agentType === 'llm'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">LLM 에이전트</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">순수하게 LLM을 호출하는 API (Ollama, LM Studio 등)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-model" className="text-xs font-bold">활성 모델 선택 *</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="agent-model" className="w-full bg-white dark:bg-zinc-900 h-9">
                      <SelectValue placeholder="사용할 모델을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.length > 0 ? (
                        models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.id}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={selectedModel}>{selectedModel} (현재 모델)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">이 에이전트와 통신할 때 사용할 LLM 모델입니다.</p>
                </div>



                {/* 실행 환경 및 프로그램 설정 */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold">실행 환경 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvType('local')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                        envType === 'local'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs">로컬 (Local)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvType('cloud')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                        envType === 'cloud'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs">클라우드 (Cloud)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">에이전트 프로그램 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {agentType === 'harness' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAgentProgram('hermes')}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'hermes'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">Hermes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentProgram('openclaw')}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'openclaw'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">Open claw</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setAgentProgram('ollama')}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'ollama'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">Ollama</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentProgram('lmstudio')}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'lmstudio'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">LM Studio</span>
                        </button>
                      </>
                    )}
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
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">에이전트명</span>
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">에이전트 타입</span>
                  <Badge variant="secondary" className="font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {agent.agent_type === 'llm' ? 'LLM 에이전트' : '하네스 에이전트'}
                  </Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">활성 모델</span>
                  <span className="text-sm font-mono font-semibold text-primary">
                    {agent.selected_model || 'hermes-agent'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 gap-1">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">API Endpoint URL</span>
                  <span className="text-sm font-mono text-foreground break-all sm:text-right">{agent.endpoint}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">API 인증 키 여부</span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {agent.api_key ? '********' : '없음'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">실행 환경</span>
                  <Badge variant="secondary" className="font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {agent.env_type === 'cloud' ? '클라우드' : '로컬'}
                  </Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">에이전트 프로그램</span>
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {agent.agent_program || '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">등록 일시</span>
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {new Date(agent.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2">
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
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 py-3 px-6 flex flex-row items-center justify-between">
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
        
        <CardContent className="py-4 px-6">
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
              
              <div className="space-y-1.5">
                <Label htmlFor="activeModelSelect" className="text-xs text-muted-foreground font-medium">모델 즉시 선택</Label>
                <Select value={activeModel} onValueChange={handleSelectModel} disabled={isUpdatingModel}>
                  <SelectTrigger id="activeModelSelect" className="w-full bg-white dark:bg-zinc-900 h-9">
                    <SelectValue placeholder="모델 변경" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
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

    </div>
  );
}
