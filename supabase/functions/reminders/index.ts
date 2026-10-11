// Accepts push subscriptions and schedules/cancels reminders for an anonymous device.
// Only device id, push endpoint, reminder title (<=200 chars) and due time are stored.
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const dev = String(b.device_id || "");
  if (!/^[a-f0-9]{32,64}$/.test(dev)) return json({ error: "bad device_id" }, 400);
  switch (b.action) {
    case "config": {
      const { data } = await db.from("app_config").select("value").eq("key", "vapid_public").single();
      return json({ vapidPublicKey: data?.value });
    }
    case "subscribe": {
      const s = b.subscription;
      if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys?.auth) return json({ error: "bad subscription" }, 400);
      const { error } = await db.from("push_subscriptions").upsert({ device_id: dev, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, updated_at: new Date().toISOString() });
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    case "unsubscribe": { await db.from("push_subscriptions").delete().eq("device_id", dev); return json({ ok: true }); }
    case "schedule": {
      const list = (Array.isArray(b.reminders) ? b.reminders : []).slice(0, 500).map((r: any) => ({ device_id: dev, entry_id: String(r.id).slice(0, 40), title: String(r.title || "Reminder").slice(0, 200), due_at: new Date(r.due).toISOString(), all_day: !!r.allDay, sent_at: new Date(r.due).getTime() < Date.now() - 6e4 ? new Date().toISOString() : null }))
        .filter((r: any) => !isNaN(Date.parse(r.due_at)));
      if (b.replace) await db.from("reminders").delete().eq("device_id", dev);
      if (!list.length) return json({ ok: true, count: 0 });
      const { error } = await db.from("reminders").upsert(list);
      return error ? json({ error: error.message }, error.code === "23503" ? 409 : 500) : json({ ok: true, count: list.length });
    }
    case "cancel": {
      const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 500);
      if (ids.length) await db.from("reminders").delete().eq("device_id", dev).in("entry_id", ids);
      return json({ ok: true });
    }
  }
  return json({ error: "unknown action" }, 400);
});
