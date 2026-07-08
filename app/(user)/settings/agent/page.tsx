'use client';

import { Info, Cpu } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgentSettings } from '@/hooks/use-agent-settings';
import { useToast } from '@/components/ui/toast';

export default function SettingsAgentPage() {
  const { maxTokens, setMaxTokens } = useAgentSettings();
  const { toast } = useToast();

  const handleMaxTokensChange = (value: string) => {
    setMaxTokens(value);
    toast({
      title: '설정 저장 완료',
      description: `기본 에이전트의 최대 토큰 수가 ${value}으로 변경되었습니다.`,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 shadow-sm transition-all duration-300">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">알림</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          에이전트의 최대 토큰 수 설정은 현재 앱 전체에서 참조할 수 있는 파라미터로 동작합니다. 실제 토큰 제어 기능은 추후 구현될 예정입니다.
        </AlertDescription>
      </Alert>

      {/* 기본 에이전트 설정 카드 - 이제 이 카드 부분은 활성화됨 */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Cpu className="size-5" />
            <CardTitle className="text-xl">기본 에이전트 설정</CardTitle>
          </div>
          <CardDescription>
            기본으로 사용할 에이전트 및 모델의 성능 매개변수를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="max-tokens" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              최대 토큰 수 (Max Tokens)
            </Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Select value={maxTokens} onValueChange={handleMaxTokensChange}>
                <SelectTrigger id="max-tokens" className="w-[180px] bg-popover">
                  <SelectValue placeholder="토큰 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4k">4k (4,096 tokens)</SelectItem>
                  <SelectItem value="8k">8k (8,192 tokens)</SelectItem>
                  <SelectItem value="16k">16k (16,384 tokens)</SelectItem>
                  <SelectItem value="32k">32k (32,768 tokens)</SelectItem>
                  <SelectItem value="64k">64k (65,536 tokens)</SelectItem>
                  <SelectItem value="128k">128k (131,072 tokens)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-relaxed">
                에이전트가 응답 생성이나 문맥 파싱에 사용할 최대 토큰을 제한합니다. 모델과 요금 정책에 맞춰 권장 값을 선택하십시오.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>알림 및 크론 설정</CardTitle>
          <CardDescription>에이전트의 알림 채널(Slack, Telegram)과 크론 스케줄을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>에이전트 연동 관리</CardTitle>
          <CardDescription>외부 에이전트 엔드포인트 및 API 키를 통합 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
