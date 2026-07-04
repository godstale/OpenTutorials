'use client';

import { SignUpForm } from '@/components/sign-up-form';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { createClient } from '@/lib/supabase/client';

async function signUpWithGoogle() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    console.error('Google OAuth error:', error.message);
    alert(`Google 회원가입 중 오류가 발생했습니다: ${error.message}`);
  }
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">PennyPress</h1>
          <p className="mt-2 text-muted-foreground">AI Agent 기능을 쉽게 구독하고 사용하세요</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">회원가입</h2>
          <SignUpForm />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>
          <button
            type="button"
            onClick={signUpWithGoogle}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 회원가입
          </button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
