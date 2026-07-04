'use client';

import { useState } from 'react';
import { SERVICE_TYPE_LABELS } from '@/lib/dummy-data';
import { HydraAgentSubscription, ProfileSubscriptionConfig } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Bot, ChevronDown, ChevronUp, Clock, Hash, Server, Slack, MessageCircle, AlertTriangle } from 'lucide-react';

export function StatusBadge({ status }: { status: HydraAgentSubscription['status'] }) {
  const variants: Record<typeof status, { label: string; className: string }> = {
    active: { label: '활성', className: 'bg-green-100 text-green-700' },
    paused: { label: '일시정지', className: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: '취소됨', className: 'bg-red-100 text-red-700' },
  };
  const v = variants[status];
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.className}`}>{v.label}</span>;
}

export function ProfileConfigCard({ config }: { config: ProfileSubscriptionConfig }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">LLM 모델</p>
          <Badge variant="secondary">{config.llm_model}</Badge>
        </div>

        {config.cron_expression && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="size-3" /> 크론 설정
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded">{config.cron_expression}</code>
          </div>
        )}

        {config.slack_channel && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Slack className="size-3" /> Slack 채널
            </p>
            <span className="text-xs">{config.slack_channel}</span>
          </div>
        )}

        {config.telegram_chat_id && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <MessageCircle className="size-3" /> Telegram 채팅
            </p>
            <span className="text-xs">{config.telegram_chat_id}</span>
          </div>
        )}
      </div>

      {config.user_memory && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Hash className="size-3" /> 사용자 메모리 (User.md)
          </p>
          <p className="text-xs bg-muted rounded p-2 line-clamp-3">{config.user_memory}</p>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => alert('설정 수정은 Phase 2에서 구현됩니다.')}>
        설정 수정
      </Button>
    </div>
  );
}

export default function SubscriptionCard({ subscription }: { subscription: HydraAgentSubscription }) {
  const { service, profile_configs, status, started_at } = subscription;
  const [openProfiles, setOpenProfiles] = useState<Set<string>>(new Set());

  const toggleProfile = (profileId: string) => {
    setOpenProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{service.name}</CardTitle>
            <CardDescription className="mt-1">{service.description}</CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Server className="size-4" />
            {SERVICE_TYPE_LABELS[service.service_type]}
          </span>
          <span className="flex items-center gap-1">
            <Bot className="size-4" />
            {service.profiles.length}개 프로파일
          </span>
          <span>구독 시작: {new Date(started_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            월 호스팅 비용:{' '}
            <span className="text-primary font-semibold">₩{service.hosting_fee_monthly.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('일시정지 기능은 Phase 2에서 구현됩니다.')}
            >
              일시정지
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => {
                if (confirm('구독을 취소하면 에이전트 메모리가 삭제되며 되돌릴 수 없습니다. 계속하시겠습니까?')) {
                  alert('구독 취소 기능은 Phase 2에서 구현됩니다.');
                }
              }}
            >
              <AlertTriangle className="size-4 mr-1" />
              구독 취소
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">프로파일별 설정</h4>
          <div className="space-y-2">
            {service.profiles.map((profile) => {
              const config = profile_configs.find((c) => c.profile_id === profile.id);
              const isOpen = openProfiles.has(profile.id);
              return (
                <div key={profile.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleProfile(profile.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{profile.name}</span>
                      <span className="text-xs text-muted-foreground">{profile.role}</span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      {config ? (
                        <ProfileConfigCard config={config} />
                      ) : (
                        <p className="text-sm text-muted-foreground">설정 정보가 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
