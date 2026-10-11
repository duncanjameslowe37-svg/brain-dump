// Called every minute by pg_cron. Sends Web Push for due, unsent reminders.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
Deno.serve(async (req) => {
  const { data: cfg } = await db.from("app_config").select("key,value");
  const c = Object.fromEntries((cfg || []).map((r: any) => [r.key, r.value]));
  if (!c.cron_secret || req.headers.get("x-cron-secret") !== c.cron_secret) return new Response("forbidden", { status: 403 });
  webpush.setVapidDetails(c.vapid_subject, c.vapid_public, c.vapid_private);
  const { data: due, error } = await db.from("reminders").select("device_id,entry_id,title,due_at,all_day")
    .is("sent_at", null).lte("due_at", new Date().toISOString()).gte("due_at", new Date(Date.now() - 12 * 36e5).toISOString()).limit(200);
  if (error) return new Response(error.message, { status: 500 });
  const devs = [...new Set((due || []).map((r: any) => r.device_id))];
  const { data: subs } = devs.length ? await db.from("push_subscriptions").select("device_id,endpoint,p256dh,auth").in("device_id", devs) : { data: [] };
  const subOf = new Map((subs || []).map((s: any) => [s.device_id, s]));
  let sent = 0, gone = 0, failed = 0;
  await Promise.all((due || []).map(async (r: any) => {
    const s: any = subOf.get(r.device_id); if (!s) { await db.from("reminders").update({ sent_at: new Date().toISOString() }).eq("device_id", r.device_id).eq("entry_id", r.entry_id); return; }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ id: r.entry_id, title: r.title, due: r.due_at, allDay: r.all_day }), { TTL: 3600, urgency: "high" });
      sent++;
    } catch (e: any) {
      if (e.statusCode === 404 || e.statusCode === 410) { gone++; await db.from("push_subscriptions").delete().eq("device_id", r.device_id); subOf.delete(r.device_id); return; }
      failed++; return; // retry next minute
    }
    await db.from("reminders").update({ sent_at: new Date().toISOString() }).eq("device_id", r.device_id).eq("entry_id", r.entry_id);
  }));
  // housekeeping
  await db.from("reminders").delete().lt("due_at", new Date(Date.now() - 30 * 864e5).toISOString());
  return Response.json({ checked: due?.length || 0, sent, gone, failed });
});
