import { getSetting, setSetting, listOpportunities } from "@/db/repo";
import { sendWebhook, DEFAULT_NOTIFY, type NotificationSetting } from "./notify";
import { alertText } from "./report";

// After a mining run, alert on newly-appeared high-potential opportunities.
// Tracks previously-alerted titles so each opportunity only fires once.
export async function checkAndAlert(): Promise<{ alerted: number; skipped?: string }> {
  const notify = await getSetting<NotificationSetting>("notifications", DEFAULT_NOTIFY);
  if (!notify.alertEnabled || !notify.webhookUrl) {
    return { alerted: 0, skipped: "alerts disabled or no webhook" };
  }

  const opps = await listOpportunities({ limit: 200 });
  const high = opps.filter((o) => o.score.total >= notify.alertThreshold);
  const seen = new Set(notify.lastAlertedTitles);
  const fresh = high.filter((o) => !seen.has(o.title));

  // Always advance the watermark to all current high-score titles so we don't
  // re-alert on the same ones next run.
  await setSetting("notifications", {
    ...notify,
    lastAlertedTitles: high.map((o) => o.title),
  });

  if (fresh.length === 0) return { alerted: 0 };
  await sendWebhook(
    notify.webhookUrl,
    alertText(fresh.map((o) => ({ title: o.title, total: o.score.total })))
  );
  return { alerted: fresh.length };
}
