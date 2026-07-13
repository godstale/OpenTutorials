'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutGrid, Calendar, Clock, RefreshCw, 
  CheckCircle2, XCircle, ShieldAlert, Settings, Edit3, Save, X, Eye, EyeOff, Loader2, Bot
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
import { useLanguage } from '@/lib/context/LanguageContext';
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
  hidden?: boolean;
}

const programNames = {
  hermes: 'Hermes',
  openclaw: 'Open claw',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  other: '기타',
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  kimi: 'Kimi'
};

export default function AgentSettingsTab({ agent }: AgentSettingsTabProps) {
  const { t } = useLanguage();
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
  const [manualModelInput, setManualModelInput] = useState<string>(agent.selected_model || '');
  const [envType, setEnvType] = useState<'local' | 'cloud'>(agent.env_type || 'local');

  const [agentProgram, setAgentProgram] = useState<
    | 'hermes' | 'openclaw' | 'ollama' | 'lmstudio' | 'other'
    | 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'kimi'
  >(agent.agent_program || 'hermes');


  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);

  const updateEndpoint = (
    env: 'local' | 'cloud',
    program: 'hermes' | 'openclaw' | 'ollama' | 'lmstudio' | 'other' | 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'kimi',
    type: 'harness' | 'llm'
  ) => {
    if (env === 'cloud' && type === 'llm') {
      const providers: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        claude: 'https://api.anthropic.com/v1',
        gemini: 'https://generativelanguage.googleapis.com/v1beta',
        deepseek: 'https://api.deepseek.com/v1',
        qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        kimi: 'https://api.moonshot.cn/v1',
      };
      if (providers[program]) {
        setEndpoint(providers[program]);
        setTestResult(null);
        return;
      }
    }

    const host = env === 'local' ? 'localhost' : 'YOUR-CLOUD-IP';
    let url = '';
    if (type === 'harness') {
      if (program === 'openclaw') {
        url = `http://${host}:8000/v1`;
      } else if (program === 'other') {
        url = `http://${host}:/v1`;
      } else {
        url = `http://${host}:8642/v1`;
      }
    } else {
      if (program === 'lmstudio') {
        url = `http://${host}:1234/v1`;
      } else if (program === 'other') {
        url = `http://${host}:/v1`;
      } else {
        url = `http://${host}:11434/v1`;
      }
    }
    setEndpoint(url);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!endpoint) return;
    setIsTesting(true);
    setTestResult(null);
    setDetectedModels([]);
    try {
      const activeApiKey = apiKey.trim() || agent.api_key || '';
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint, 
          api_key: activeApiKey,
          agent_program: agentProgram,
          agent_type: agentType 
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (agentType === 'harness') {
          setSelectedModel('hermes-agent');
          setTestResult({
            success: true,
            message: t('agentSettingsTestSuccessHarness'),
          });
          return;
        }

        const modelsList = Array.isArray(data.models) ? data.models : [];
        const modelIds = modelsList.map((m: { id: string }) => m.id);

        if (modelIds.length === 0) {
          setTestResult({
            success: false,
            message: t('agentSettingsTestNoModel'),
          });
          return;
        }

        setDetectedModels(modelIds);
        setModels(modelsList);
        const initialModel = modelIds[0] || '';

        if (initialModel) {
          setSelectedModel(initialModel);
        }

        const modelNames = modelIds.join(', ') || t('agentSettingsModelNone');
        setTestResult({
          success: true,
          message: t('agentSettingsTestSuccessLlm').replace('{models}', modelNames),
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || t('agentSettingsTestFail'),
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t('agentSettingsNetworkError');
      setTestResult({
        success: false,
        message: errMsg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Models list state
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const fetchModels = useCallback(async (isManualRefresh = false) => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint: agent.endpoint, 
          api_key: agent.api_key,
          agent_program: agent.agent_program,
          agent_type: agent.agent_type 
        }),
      });
      const data = await res.json();
      if (isMountedRef.current) {
        if (data.success) {
          const modelsList: ModelItem[] = data.models || [];
          setModels(modelsList);

          // 하네스 에이전트인 경우 에이전트와 연결된 현재 사용 중인 LLM 모델 정보를 저장하고 표시
          if (agent.agent_type === 'harness') {
            const actualLLMModels = modelsList.filter(m => !m.hidden);
            const detectedLLMModel = data.current_model || (actualLLMModels.length > 0 ? actualLLMModels[0].id : null);
            if (detectedLLMModel) {
              const isCurrentModelHidden = modelsList.find(m => m.id === agent.selected_model)?.hidden;
              if (isManualRefresh || isCurrentModelHidden || agent.selected_model !== detectedLLMModel) {
                try {
                  await updateExternalAgent(agent.id, { selected_model: detectedLLMModel });
                  window.location.reload();
                  return;
                } catch (e) {
                  console.error('Failed to auto update harness LLM model:', e);
                }
              }
            }
          }
        } else {
          setModelsError(data.error || t('agentSettingsNoModelDescLlm'));
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setModelsError(err instanceof Error ? err.message : t('agentSettingsNetworkError2'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingModels(false);
      }
    }
  }, [agent.id, agent.agent_type, agent.selected_model, agent.endpoint, agent.api_key]);

  // Fetch models automatically when component mounts
  useEffect(() => {
    if (agent.agent_type !== 'harness') {
      fetchModels(false);
    }
  }, [agent.agent_type, fetchModels]);

  const [isUpdatingModel, setIsUpdatingModel] = useState(false);

  const handleSelectModel = async (modelId: string) => {
    if (isUpdatingModel) return;
    setIsUpdatingModel(true);
    try {
      await updateExternalAgent(agent.id, { selected_model: modelId });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t('agentSettingsModelChangeError'));
    } finally {
      setIsUpdatingModel(false);
    }
  };

  const activeModel = agent.selected_model || 'hermes-agent';
  const hasModelInfo = (!!agent.selected_model && agent.selected_model.trim() !== '') || models.length > 0;


  const connectionChanged = 
    endpoint !== agent.endpoint || 
    apiKey.trim() !== '' || 
    agentType !== agent.agent_type ||
    agentProgram !== agent.agent_program;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint) return;

    if (connectionChanged && !testResult?.success) {
      setSaveError(t('agentSettingsSaveNeedTest'));
      return;
    }

    const selected_model = selectedModel.trim() || (agentType === 'harness' ? 'hermes-agent' : '');
    if (agentType === 'llm' && !selected_model) {
      setSaveError(t('agentSettingsSaveNeedModel'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updates: Partial<Omit<UserExternalAgent, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
        name,
        endpoint,
        agent_type: agentType,
        selected_model,
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
        setSaveError(err instanceof Error ? err.message : t('agentSettingsSaveError'));
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
    setTestResult(null);
    setIsEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Basic Configuration Card */}
      <Card className="md:col-span-2 border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row items-center justify-between pb-5 px-6">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              {t('agentSettingsCardTitle')}
            </CardTitle>
            <CardDescription className="text-xs">{t('agentSettingsCardDesc')}</CardDescription>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5 active:scale-95 transition-all">
              <Edit3 className="size-3.5" />
              {t('agentSettingsEditBtn')}
            </Button>
          )}
        </CardHeader>
        
        <form onSubmit={handleSave}>
          <CardContent className="px-6 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-xs font-bold">{t('agentSettingsNameLabel')}</Label>
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
                  <Label htmlFor="agent-endpoint" className="text-xs font-bold">{t('agentSettingsEndpointLabel')}</Label>
                  <Input 
                    id="agent-endpoint" 
                    required 
                    value={endpoint} 
                    disabled={envType === 'cloud' && agentType === 'llm'}
                    onChange={(e) => setEndpoint(e.target.value)} 
                    placeholder="예: http://127.0.0.1:8642/v1"
                    className="bg-white dark:bg-zinc-900 font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agent-apikey" className="text-xs font-bold">{t('agentSettingsApiKeyLabel')}</Label>
                  <div className="relative">
                    <Input 
                      id="agent-apikey" 
                      type={showApiKey ? "text" : "password"} 
                      value={apiKey} 
                      onChange={(e) => setApiKey(e.target.value)} 
                      placeholder={t('agentSettingsApiKeyPlaceholder')}
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
                  <Label className="text-xs font-bold">{t('agentSettingsTypeLabel')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAgentType('harness');
                        const defaultProgram = 'hermes';
                        setAgentProgram(defaultProgram);
                        updateEndpoint(envType, defaultProgram, 'harness');
                      }}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        agentType === 'harness'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">{t('agentSettingsTypeHarnessTitle')}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{t('agentSettingsTypeHarnessDesc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAgentType('llm');
                        const defaultProgram = envType === 'local' ? 'ollama' : 'openai';
                        setAgentProgram(defaultProgram);
                        updateEndpoint(envType, defaultProgram, 'llm');
                      }}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        agentType === 'llm'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">{t('agentSettingsTypeLlmTitle')}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{t('agentSettingsTypeLlmDesc')}</span>
                    </button>
                  </div>
                </div>





                {/* 실행 환경 및 프로그램 설정 */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold">{t('agentSettingsEnvLabel')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEnvType('local');
                        const defaultProgram = agentType === 'harness' ? 'hermes' : 'ollama';
                        setAgentProgram(defaultProgram);
                        updateEndpoint('local', defaultProgram, agentType);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                        envType === 'local'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs">{t('agentSettingsEnvLocal')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEnvType('cloud');
                        const defaultProgram = agentType === 'harness' ? 'hermes' : 'openai';
                        setAgentProgram(defaultProgram);
                        updateEndpoint('cloud', defaultProgram, agentType);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                        envType === 'cloud'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                          : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs">{t('agentSettingsEnvCloud')}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">{t('agentSettingsProgramLabel')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {agentType === 'harness' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAgentProgram('hermes');
                            updateEndpoint(envType, 'hermes', 'harness');
                          }}
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
                          onClick={() => {
                            setAgentProgram('openclaw');
                            updateEndpoint(envType, 'openclaw', 'harness');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'openclaw'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">Open claw</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgentProgram('other');
                            updateEndpoint(envType, 'other', 'harness');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'other'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">{t('agentSettingsProgramOther')}</span>
                        </button>
                      </>
                    ) : envType === 'local' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAgentProgram('ollama');
                            updateEndpoint(envType, 'ollama', 'llm');
                          }}
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
                          onClick={() => {
                            setAgentProgram('lmstudio');
                            updateEndpoint(envType, 'lmstudio', 'llm');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'lmstudio'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">LM Studio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgentProgram('other');
                            updateEndpoint(envType, 'other', 'llm');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            agentProgram === 'other'
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                              : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span className="text-xs">{t('agentSettingsProgramOther')}</span>
                        </button>
                      </>
                    ) : (
                      <div className="col-span-3 grid grid-cols-3 gap-2">
                        {[
                          { key: 'openai', label: 'OpenAI' },
                          { key: 'claude', label: 'Claude' },
                          { key: 'gemini', label: 'Gemini' },
                          { key: 'deepseek', label: 'DeepSeek' },
                          { key: 'qwen', label: 'Qwen' },
                          { key: 'kimi', label: 'Kimi' },
                        ].map((prov) => (
                          <button
                            key={prov.key}
                            type="button"
                            onClick={() => {
                              setAgentProgram(prov.key as any);
                              updateEndpoint(envType, prov.key as any, 'llm');
                            }}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                              agentProgram === prov.key
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-400 font-bold'
                                : 'border-border bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <span className="text-xs">{prov.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 연결상태 확인 및 활성 모델 설정 */}
                <div className="space-y-4 py-4 border-t">
                  <div className="flex items-center justify-between gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTestConnection} 
                      disabled={isTesting || !endpoint}
                      className="h-9 text-xs"
                    >
                      {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('agentSettingsTestBtn')}
                    </Button>
                    
                    {testResult && (
                      <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}`}>
                        {testResult.success ? <CheckCircle2 className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
                        <span className="line-clamp-2">{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {agentType === 'llm' && (
                    <div className="space-y-2 rounded-lg border border-border/85 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 mt-1">
                      <div className="space-y-1.5">
                        <Label htmlFor="agent-model" className="text-xs font-bold">
                          {t('agentSettingsActiveModelLabel')}
                        </Label>
                        <Input 
                          id="agent-model"
                          readOnly
                          disabled
                          value={selectedModel}
                          placeholder={t('agentSettingsActiveModelPlaceholder')}
                          className="bg-zinc-100 dark:bg-zinc-900/50 h-9 text-sm text-muted-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {t('agentSettingsActiveModelHint')}
                        </p>
                      </div>
                    </div>
                  )}
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
                <div className="flex justify-between pb-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewName')}</span>
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                </div>

                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewType')}</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <Badge variant="secondary" className="font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40 border">
                      {agent.agent_type === 'llm' ? t('agentSettingsViewTypeLlm') : t('agentSettingsViewTypeHarness')}
                    </Badge>
                    <Badge variant="secondary" className="font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {agent.env_type === 'cloud' ? t('agentSettingsViewCloud') : t('agentSettingsViewLocal')}
                    </Badge>
                    <Badge variant="secondary" className="font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {programNames[agent.agent_program as keyof typeof programNames] || agent.agent_program || t('agentSettingsProgramOther')}
                    </Badge>
                  </div>
                </div>
                {agent.agent_type !== 'harness' && (
                  <div className="flex justify-between py-3">
                    <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewActiveModel')}</span>
                    <span className="text-sm font-mono font-semibold text-primary">
                      {agent.selected_model || 'hermes-agent'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">{t('agentSettingsViewEndpoint')}</span>
                  <span className="text-sm font-mono text-foreground break-all sm:text-right">{agent.endpoint}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewApiKey')}</span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {agent.api_key ? '********' : t('agentSettingsViewApiKeyNone')}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewCreatedAt')}</span>
                  <span className="text-xs text-foreground flex items-center gap-1">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {new Date(agent.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('agentSettingsViewUpdatedAt')}</span>
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
                {t('agentSettingsCancelBtn')}
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={isSaving || (connectionChanged && !testResult?.success)} 
                className="gap-1.5 shadow active:scale-95 transition-all"
              >
                <Save className="size-4" />
                {t('agentSettingsSaveBtn')}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Model Inquiry Card */}
      <Card className="border border-border/70 shadow-md rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md">
        <CardHeader className="border-b border-border/60 bg-zinc-50/50 dark:bg-zinc-900/50 pb-5 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <LayoutGrid className="size-4.5 text-primary" />
              {t('agentSettingsModelCardTitle')}
            </CardTitle>
            <CardDescription className="text-[10px]">
              {agent.agent_type === 'harness' 
                ? t('agentSettingsModelCardDescHarness') 
                : t('agentSettingsModelCardDescLlm')}
            </CardDescription>
          </div>
          {agent.agent_type !== 'harness' && (
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => fetchModels(true)} 
              disabled={isLoadingModels}
              className="size-8 rounded-lg active:scale-95 transition-all"
              title={t('agentSettingsRefreshTitle')}
            >
              <RefreshCw className={`size-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          {agent.agent_type === 'harness' ? (
            <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-2 shadow-sm text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center gap-1.5">
                <Bot className="size-4 text-blue-500" />
                {t('agentSettingsHarnessInfo')}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                {t('agentSettingsHarnessInfoDesc')}
              </p>
            </div>
          ) : isLoadingModels ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground animate-pulse">{t('agentSettingsLoadingModels')}</span>
            </div>
          ) : !hasModelInfo ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 shadow-sm text-center">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center gap-1.5">
                <ShieldAlert className="size-4" />
                {t('agentSettingsNoModelTitle')}
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {(agent.agent_type as string) === 'harness' 
                  ? t('agentSettingsNoModelDescHarness')
                  : t('agentSettingsNoModelDescLlm')
                }
              </p>
              <div className="flex gap-2 max-w-xs mx-auto pt-1">
                <Input 
                  placeholder="예: gemma-2-9b-it" 
                  value={manualModelInput} 
                  onChange={(e) => setManualModelInput(e.target.value)} 
                  className="h-8 text-xs bg-white dark:bg-zinc-900"
                />
                <Button 
                  size="sm" 
                  onClick={() => handleSelectModel(manualModelInput)} 
                  disabled={isUpdatingModel || !manualModelInput.trim()}
                  className="h-8 text-xs shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 border-none"
                >
                  {t('agentSettingsUpdateBtn')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                let displayModels = (agent.agent_type as string) === 'harness' 
                  ? models.filter(m => !m.hidden) 
                  : models;

                if (agent.selected_model && !displayModels.some(m => m.id === agent.selected_model)) {
                  displayModels = [
                    { id: agent.selected_model, object: 'model', created: 0, owned_by: 'system' },
                    ...displayModels
                  ];
                }

                return (
                  <>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('agentSettingsModelCount').replace('{count}', String(displayModels.length))}</p>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="activeModelSelect" className="text-xs text-muted-foreground font-medium">{t('agentSettingsModelSelectLabel')}</Label>
                      <Select value={activeModel} onValueChange={handleSelectModel} disabled={isUpdatingModel}>
                        <SelectTrigger id="activeModelSelect" className="w-full bg-white dark:bg-zinc-900 h-9">
                          <SelectValue placeholder={t('agentSettingsModelSelectPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {displayModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {displayModels.map((model) => {
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
                  </>
                );
              })()}
              
              {modelsError ? (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                  <ShieldAlert className="size-3.5 shrink-0" />
                  <span>{t('agentSettingsModelError').replace('{error}', modelsError)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>{t('agentSettingsModelOk')}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
