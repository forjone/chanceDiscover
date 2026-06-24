// Outbound webhook delivery. Slack/Feishu incoming webhooks accept a `text`
// field; generic endpoints get a structured JSON body too. No external SDK.

export interface NotificationSetting {
  webhookUrl: string;
  alertThreshold: number; // alert when a new opportunity scores >= this
  alertEnabled: boolean;
  lastAlertedTitles: string[];
}

export const DEFAULT_NOTIFY: NotificationSetting = {
  webhookUrl: "",
  alertThreshold: 70,
  alertEnabled: false,
  lastAlertedTitles: [],
};

export interface NotifyResult {
  ok: boolean;
  status?: number;
  error?: string;
}

function isSlackLike(url: string): boolean {
  return /hooks\.slack\.com|open\.feishu\.cn|dingtalk|discord\.com\/api\/webhooks/i.test(url);
}

export async function sendWebhook(
  url: string,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<NotifyResult> {
  if (!url) return { ok: false, error: "未配置 webhook 地址" };
  // Slack/Discord/Feishu-style payloads center on `text`/`content`.
  const slack = isSlackLike(url);
  const body = slack
    ? JSON.stringify({ text, content: text })
    : JSON.stringify({ text, source: "opportunity-miner", ...extra });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
