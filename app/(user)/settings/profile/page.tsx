'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export default function SettingsProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: any) => {
      const user = res.data?.user;
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      setNickname(user.user_metadata?.full_name || user.user_metadata?.name || '');

      const identities = user.identities ?? [];
      const hasGoogle = identities.some((id: any) => id.provider === 'google');
      setIsGoogleUser(hasGoogle);
    });
  }, [router]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nickname },
      });
      if (error) throw error;
      setProfileSuccess('프로필이 저장되었습니다.');
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('새 비밀번호를 입력하세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const displayName = nickname || user?.email?.split('@')[0] || 'U';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 프로필 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 정보</CardTitle>
          <CardDescription>다른 사용자에게 보여질 프로필을 수정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-2xl">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
          </div>

          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
          {profileSuccess && <p className="text-sm text-emerald-600">{profileSuccess}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleLogout}>로그아웃</Button>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? '저장 중...' : '저장하기'}
          </Button>
        </CardFooter>
      </Card>

      {/* 비밀번호 변경 - Google 로그인은 제외 */}
      {!isGoogleUser && (
        <Card>
          <CardHeader>
            <CardTitle>비밀번호 변경</CardTitle>
            <CardDescription>새 비밀번호를 설정합니다. 최소 6자 이상이어야 합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 재입력"
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-emerald-600">{passwordSuccess}</p>}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isSavingPassword}>
              {isSavingPassword ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isGoogleUser && (
        <Alert className="bg-yellow-500/10 text-yellow-900 dark:text-yellow-200 border-yellow-500/30 flex gap-3 items-start p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <AlertTitle className="font-semibold text-yellow-800 dark:text-yellow-300">Google 계정 연동 상태</AlertTitle>
            <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-400">
              Google 계정으로 로그인했습니다. 비밀번호는 Google 계정 설정에서 관리하세요.
            </AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
