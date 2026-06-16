"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pickaxe, Loader2 } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "登录失败");
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ore-500/15 ring-1 ring-ore-500/30">
          <Pickaxe className="h-5 w-5 text-ore-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-rock-50">机会矿工</div>
          <div className="text-[11px] text-rock-500">请输入访问密码</div>
        </div>
      </div>
      <input
        type="password"
        autoFocus
        className="input"
        placeholder="访问密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading || !password} className="btn-primary mt-4 w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        进入
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="text-sm text-rock-500">加载中…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
