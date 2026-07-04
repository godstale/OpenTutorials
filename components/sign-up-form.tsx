"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      const matchErr = "비밀번호가 일치하지 않습니다.";
      setError(matchErr);
      setIsLoading(false);
      alert(matchErr);
      return;
    }

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${ROUTES.DASHBOARD}`,
        },
      });

      if (error) throw error;
      
      router.push(ROUTES.SIGN_UP_SUCCESS);
    } catch (err: unknown) {
      console.error("[SignUpForm] 회원가입 처리 중 오류 발생:", err);
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errMsg);
      alert(`회원가입에 실패했습니다:\n${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSignUp}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">비밀번호</Label>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="repeat-password">비밀번호 확인</Label>
            </div>
            <Input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "가입 요청 중..." : "회원가입"}
          </Button>
        </div>
      </form>
    </div>
  );
}
