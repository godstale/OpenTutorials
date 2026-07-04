'use client';

import { useState } from 'react';
import { SERVICE_TYPE_FILTERS, SERVICE_TYPE_LABELS, HYDRA_SERVICE_TAGS } from '@/lib/dummy-data';
import { HydraAgentService } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Search, Bot, Server, Coins, Users } from 'lucide-react';

function ServiceTypeLabel({ type }: { type: string }) {
  const colors: Record<string, string> = {
    basic: 'bg-blue-100 text-blue-700',
    mao_template: 'bg-purple-100 text-purple-700',
    marketing_template: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {SERVICE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function ServiceCard({ service, onSubscribe }: { service: HydraAgentService; onSubscribe: (s: HydraAgentService) => void }) {
  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug">{service.name}</CardTitle>
          <ServiceTypeLabel type={service.service_type} />
        </div>
        <CardDescription className="line-clamp-2 mt-1">{service.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Bot className="size-4 shrink-0" />
            <span>{service.profiles.length}개 프로파일</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-4 shrink-0" />
            <span>{service.subscriber_count.toLocaleString()}명 구독</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Server className="size-4 shrink-0" />
            <span>₩{service.hosting_fee_monthly.toLocaleString()}/월</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Coins className="size-4 shrink-0" />
            <span>₩{service.token_cost_per_1k}/1K 토큰</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">프로파일</p>
          <div className="flex flex-wrap gap-1">
            {service.profiles.map((p) => (
              <span key={p.id} className="text-xs bg-muted px-2 py-0.5 rounded-md">{p.name}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {service.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t bg-muted/10">
        <Button className="w-full" onClick={() => onSubscribe(service)}>
          구독 신청
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function FeaturesClient({ services }: { services: HydraAgentService[] }) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('전체');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filtered = services.filter((s) => {
    const matchSearch = s.name.includes(search) || s.description.includes(search);
    const matchType = selectedType === '전체' || s.service_type === selectedType;
    const matchTags = selectedTags.length === 0 || selectedTags.some((t) => s.tags.includes(t));
    return matchSearch && matchType && matchTags;
  });

  const handleSubscribe = (service: HydraAgentService) => {
    alert(`"${service.name}" 구독 신청은 Phase 2에서 구현됩니다.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">에이전트 마켓플레이스</h1>
        <p className="text-muted-foreground mt-2">목적에 맞는 HydraAgent 호스팅 서비스를 찾아 구독하세요.</p>
      </div>

      <div className="space-y-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="서비스 이름이나 설명을 검색하세요..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SERVICE_TYPE_FILTERS.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="shrink-0"
            >
              {type === '전체' ? '전체' : SERVICE_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground mr-2 flex items-center">태그:</span>
          {HYDRA_SERVICE_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => (
          <ServiceCard key={service.id} service={service} onSubscribe={handleSubscribe} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          조건에 맞는 서비스가 없습니다.
        </div>
      )}
    </div>
  );
}
