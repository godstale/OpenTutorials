'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Globe, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', 'local-user-id')
          .maybeSingle();

        if (error) throw error;

        if (profile) {
          setNickname(profile.nickname || '');
          setEmail(profile.email || '');
          setHomepageUrl(profile.homepage_url || '');
        } else {
          // If no profile row exists, default values
          setNickname('Local User');
          setEmail('user@opentutor.local');
          setHomepageUrl('');
        }
      } catch (err: any) {
        console.error('Failed to load user profile:', err);
        setError('프로필 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 1. Validation
    if (!nickname.trim()) {
      setError('닉네임은 필수 항목입니다.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    if (homepageUrl.trim()) {
      let url = homepageUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        setError('홈페이지 URL은 http:// 또는 https://로 시작해야 합니다.');
        return;
      }
      try {
        new URL(url);
      } catch (_) {
        setError('올바르지 않은 홈페이지 URL 형식입니다.');
        return;
      }
    }

    // 2. Save
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('user_profiles').upsert({
        id: 'local-user-id',
        nickname: nickname.trim(),
        email: email.trim() || null,
        homepage_url: homepageUrl.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSuccess('프로필 설정이 정상적으로 저장되었습니다.');
      
      // Dispatch custom event to let other components know the profile has been updated
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }
    } catch (err: any) {
      console.error('Failed to save user profile:', err);
      setError(err.message || '프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">프로필 정보를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={handleSave}>
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <User className="size-5" />
              <CardTitle className="text-xl">프로필 설정</CardTitle>
            </div>
            <CardDescription>
              강좌를 직접 등록하거나 활동할 때 사용되는 기본 제작자(작성자) 정보입니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/50 text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/50 text-sm">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Nickname Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="nickname" className="text-sm font-semibold flex items-center gap-1.5">
                  닉네임 <span className="text-rose-500 font-bold">*</span>
                </Label>
              </div>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 홍길동"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">강좌 저작권 표기 및 제작자 이름으로 노출됩니다.</p>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="예: user@example.com"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">사용자들과 소통할 수 있는 연락처 이메일 주소입니다.</p>
            </div>

            {/* Homepage URL Input */}
            <div className="space-y-2">
              <Label htmlFor="homepageUrl" className="text-sm font-semibold">
                홈페이지 / 블로그 URL
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="homepageUrl"
                  type="text"
                  value={homepageUrl}
                  onChange={(e) => setHomepageUrl(e.target.value)}
                  placeholder="예: https://myblog.com"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">제작자 프로필에 노출될 개인 웹사이트 주소입니다. (http:// 또는 https:// 포함)</p>
            </div>
          </CardContent>

          <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="text-white bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700 px-6 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장하기'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
