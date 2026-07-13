'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExternalAgent } from '@/lib/api/external-agents';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { normalizeAgentEndpoint } from '@/lib/utils/agent-endpoint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const isLocalEndpoint = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
};

export default function AddAgentModal({ isOpen, onClose, onSuccess }: AddAgentModalProps) {
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [agentType, setAgentType] = useState<'harness' | 'llm'>('harness');
  const [envType, setEnvType] = useState<'local' | 'cloud'>('local');
  const [agentProgram, setAgentProgram] = useState<
    | 'hermes' | 'openclaw' | 'ollama' | 'lmstudio' | 'other'
    | 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'kimi'
  >('hermes');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const handleAgentTypeChange = (type: 'harness' | 'llm') => {
    setAgentType(type);
    const defaultProgram = type === 'harness' ? 'hermes' : (envType === 'local' ? 'ollama' : 'openai');
    setAgentProgram(defaultProgram);
    updateEndpoint(envType, defaultProgram, type);
  };

  const handleTestConnection = async () => {
    if (!endpoint) return;
    setIsTesting(true);
    setTestResult(null);
    setDetectedModels([]);
    setSelectedModel('');
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, api_key: apiKey, agent_program: agentProgram, agent_type: agentType }),
      });
      const data = await res.json();
      if (data.success) {
        if (agentType === 'harness') {
          setSelectedModel('hermes-agent');
          setTestResult({
            success: true,
            message: '연결 성공! (하네스 에이전트)',
          });
          return;
        }

        const modelsList = Array.isArray(data.models) ? data.models : [];
        const modelIds = modelsList.map((m: { id: string }) => m.id);

        if (modelIds.length === 0) {
          setTestResult({
            success: false,
            message: '연결은 성공했으나 LLM 모델을 찾지 못했습니다. LLM 에이전트는 모델이 반드시 존재해야 합니다.',
          });
          return;
        }

        setDetectedModels(modelIds);
        const initialModel = modelIds[0] || '';
        if (initialModel) {
          setSelectedModel(initialModel);
        }
        const modelNames = modelIds.join(', ') || '모델 감지 안됨';
        setTestResult({
          success: true,
          message: `연결 성공! 감지된 모델: ${modelNames}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || '연결 실패',
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '네트워크 연결 오류';
      setTestResult({
        success: false,
        message: errMsg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpoint || !testResult?.success) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const selected_model = selectedModel.trim() || (agentType === 'harness' ? 'hermes-agent' : '');
      if (agentType === 'llm' && !selected_model) {
        setSaveError('LLM 에이전트는 활성 모델이 반드시 지정되어야 합니다. 연결상태 확인을 완료해 주세요.');
        setIsSaving(false);
        return;
      }

      await createExternalAgent({
        name,
        endpoint,
        api_key: apiKey.trim() || undefined,
        selected_model,
        is_ai_tutor: false,
        is_tutor_configured: false,
        agent_type: agentType,
        env_type: envType,
        agent_program: agentProgram,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : '에이전트 저장에 실패했습니다.';
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEndpoint('');
    setApiKey('');
    setAgentType('harness');
    setEnvType('local');
    setAgentProgram('hermes');
    setDetectedModels([]);
    setSelectedModel('');
    setTestResult(null);
    setSaveError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>외부 에이전트 등록</DialogTitle>
          <DialogDescription>
            외부 서버에 설치된 에이전트 또는 API 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">에이전트 이름 *</Label>
            <Input id="name" required placeholder="예: My Local Hermes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">에이전트 타입 *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAgentTypeChange('harness')}
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
                onClick={() => handleAgentTypeChange('llm')}
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
            <Label className="text-sm font-bold">실행 환경 *</Label>
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
                <span className="text-xs">로컬 (Local)</span>
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
                <span className="text-xs">클라우드 (Cloud)</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">에이전트 프로그램 *</Label>
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
                    <span className="text-xs">기타</span>
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
                    <span className="text-xs">기타</span>
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

          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint URL *</Label>
            <Input 
              id="endpoint" 
              required 
              placeholder="예: http://127.0.0.1:8642/v1" 
              value={endpoint} 
              disabled={envType === 'cloud' && agentType === 'llm'}
              onChange={(e) => { 
                setEndpoint(e.target.value); 
                setTestResult(null); 
              }} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Server Key (선택)</Label>
            <div className="relative">
              <Input id="apiKey" type={showApiKey ? "text" : "password"} placeholder="API_SERVER_KEY 값" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }} className="pr-10" />
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

          <div className="pt-2 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting || !endpoint}>
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                연결상태 확인
              </Button>
              
              {testResult && (
                <div className={`flex items-center gap-1.5 text-sm ${testResult.success ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}`}>
                  {testResult.success ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                  <span className="line-clamp-2">{testResult.message}</span>
                </div>
              )}
            </div>

            {agentType === 'llm' && (
              <div className="space-y-2 rounded-lg border border-border/85 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 mt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="selectedModel" className="text-xs font-bold">
                    활성 모델 *
                  </Label>
                  <Input
                    id="selectedModel"
                    readOnly
                    disabled
                    placeholder="연결상태 확인 버튼을 클릭하면 자동으로 모델을 조회하여 입력합니다."
                    value={selectedModel}
                    className="bg-zinc-100 dark:bg-zinc-900/50 h-9 text-sm text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    연결상태 확인 시 탐색된 LLM 모델명이 자동으로 입력됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <div className="flex items-center gap-1.5 text-sm text-red-500 font-medium bg-red-500/10 p-2.5 rounded-md">
              <XCircle className="size-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="ghost" onClick={handleClose}>취소</Button>
            <Button type="submit" disabled={isSaving || !name || !endpoint || !testResult?.success}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              에이전트 추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
