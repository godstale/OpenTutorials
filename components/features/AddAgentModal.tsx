'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExternalAgent } from '@/lib/api/external-agents';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import AITutorProgressOverlay from '@/components/features/AITutorProgressOverlay';

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
  const [webUiUrl, setWebUiUrl] = useState('');
  const [isAiTutor, setIsAiTutor] = useState(false);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTutorSetupProgressOpen, setIsTutorSetupProgressOpen] = useState(false);

  const handleTestConnection = async () => {
    if (!endpoint) return;
    setIsTesting(true);
    setTestResult(null);
    setDetectedModels([]);
    try {
      const res = await fetch('/api/external-agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, api_key: apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        const modelsList = Array.isArray(data.models) ? data.models : [];
        const modelIds = modelsList.map((m: { id: string }) => m.id);
        setDetectedModels(modelIds);
        const modelNames = modelIds.join(', ') || '기본 모델';
        setTestResult({
          success: true,
          message: `연결 성공! 지원 모델: ${modelNames}`,
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
      const selected_model = detectedModels.length > 0 ? detectedModels[0] : 'hermes-agent';

      let isTutorConfigured = false;
      // AI 튜터용 에이전트로 설정 시 에이전트의 soul.md 설정을 위해 프롬프트 자동 전달
      if (isAiTutor) {
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
          body: JSON.stringify({ endpoint: v1Url, api_key: apiKey.trim() || undefined, prompt: setupPrompt }),
        });

        const chatData = await chatRes.json();
        if (!chatData.success) {
          throw new Error(`AI 튜터 설정 실패: ${chatData.error || '응답이 올바르지 않습니다.'}`);
        }
        isTutorConfigured = chatData.isConfigured === true;
      }

      await createExternalAgent({
        name,
        endpoint,
        api_key: apiKey.trim() || undefined,
        web_ui_url: webUiUrl.trim() || undefined,
        selected_model,
        is_ai_tutor: isAiTutor,
        is_tutor_configured: isTutorConfigured,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : '에이전트 저장에 실패했습니다.';
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
      setIsTutorSetupProgressOpen(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEndpoint('');
    setApiKey('');
    setWebUiUrl('');
    setIsAiTutor(false);
    setDetectedModels([]);
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
            외부 서버에 설치된 Hermes Agent의 API 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">에이전트 이름 *</Label>
            <Input id="name" required placeholder="예: My Local Hermes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint URL *</Label>
            <Input id="endpoint" required placeholder="예: http://127.0.0.1:8642/v1" value={endpoint} onChange={(e) => { 
              const val = e.target.value;
              setEndpoint(val); 
              setTestResult(null); 
              if (isLocalEndpoint(val) && !webUiUrl) {
                setWebUiUrl('http://localhost:9118');
              }
            }} />
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
          <div className="space-y-2">
            <Label htmlFor="webUiUrl">Web UI / Kanban Board URL (선택)</Label>
            <Input id="webUiUrl" placeholder="예: http://127.0.0.1:3000 (Open WebUI 등)" value={webUiUrl} onChange={(e) => setWebUiUrl(e.target.value)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-zinc-50/20 dark:bg-zinc-900/20">
            <div className="space-y-0.5">
              <Label htmlFor="isAiTutor" className="text-sm font-bold">AI 튜터(강좌 학습)용 에이전트로 설정</Label>
              <p className="text-xs text-muted-foreground">이 에이전트를 강좌 학습 화면에서 개인 AI 튜터로 활성화합니다. (유저당 1개만 지정 가능)</p>
            </div>
            <Switch
              id="isAiTutor"
              checked={isAiTutor}
              onCheckedChange={(checked) => setIsAiTutor(checked)}
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting || !endpoint}>
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              연결 테스트
            </Button>
            
            {testResult && (
              <div className={`flex items-center gap-1.5 text-sm ${testResult.success ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}`}>
                {testResult.success ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                <span className="line-clamp-2">{testResult.message}</span>
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
        <AITutorProgressOverlay isOpen={isTutorSetupProgressOpen} />
      </DialogContent>
    </Dialog>
  );
}
