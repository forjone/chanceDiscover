import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "机会矿工 · Opportunity Miner",
  description: "把散落在应用评论里的用户抱怨，提炼成排序后、带证据的产品机会。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Sidebar />
        <main className="ml-60 min-h-screen">
          <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
