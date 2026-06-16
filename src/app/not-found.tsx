import Link from "next/link";
import { Pickaxe } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ore-500/15 ring-1 ring-ore-500/30">
        <Pickaxe className="h-6 w-6 text-ore-400" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-rock-50">这里没有矿脉</h1>
      <p className="mt-1 text-sm text-rock-400">页面不存在或已被移除。</p>
      <Link href="/" className="btn-primary mt-5">
        返回总览
      </Link>
    </div>
  );
}
