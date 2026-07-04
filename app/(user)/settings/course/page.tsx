import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function SettingsCoursePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">준비 중인 기능</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          강좌 설정 기능은 현재 개발 중입니다. 조만간 다양한 강좌 관련 설정 옵션을 제공할 예정입니다.
        </AlertDescription>
      </Alert>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>학습 환경 설정</CardTitle>
          <CardDescription>강좌 재생 속도, 자막, 화질 등 학습 환경을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>학습 알림 설정</CardTitle>
          <CardDescription>강좌 업데이트 및 학습 리마인더 알림을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>수료증 및 성취 관리</CardTitle>
          <CardDescription>완료한 강좌의 수료증 발급 및 성취 배지를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">추후 제공될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
