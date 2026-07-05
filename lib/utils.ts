import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = true;

// 전역 에이전트 이탈 타이머 맵 (SPA 내부 페이지 이동 대응)
export const agentLeaveTimers: { [agentId: string]: any } = {};


