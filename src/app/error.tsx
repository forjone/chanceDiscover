"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-rock-50">出了点问题</h1>
      <p className="mt-1 max-w-md text-sm text-rock-400">{error.message || "未知错误"}</p>
      <button onClick={reset} className="btn-primary mt-5">
        重试
      </button>
    </div>
  );
}
