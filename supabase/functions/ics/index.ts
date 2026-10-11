// Subscribable calendar feed: GET /ics?d=<device_id>. The device id is an unguessable capability token.
import { createClient } from "npm:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" }).replace(/-/g, "");
Deno.serve(async (req) => {
  const d = new URL(req.url).searchParams.get("d") || "";
  if (!/^[a-f0-9]{32,64}$/.test(d)) return new Response("not found", { status: 404 });
  const { data } = await db.from("reminders").select("entry_id,title,due_at,all_day").eq("device_id", d).not("entry_id", "like", "brief-%").order("due_at").limit(1000);
  const now = z(new Date());
  const ev = (data || []).map((r: any) => { const s = new Date(r.due_at); const e = new Date(s.getTime() + (r.all_day ? 864e5 : 18e5));
    return ["BEGIN:VEVENT", `UID:${r.entry_id}@brain-dump`, `DTSTAMP:${now}`, r.all_day ? `DTSTART;VALUE=DATE:${ymd(s)}` : `DTSTART:${z(s)}`, r.all_day ? `DTEND;VALUE=DATE:${ymd(e)}` : `DTEND:${z(e)}`, `SUMMARY:${esc(r.title)}`,
      ...(r.all_day ? [] : ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(r.title)}`, "TRIGGER:-PT0M", "END:VALARM"]), "END:VEVENT"].join("\r\n"); });
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Brain Dump//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Brain Dump", "X-PUBLISHED-TTL:PT15M", "REFRESH-INTERVAL;VALUE=DURATION:PT15M", ...ev, "END:VCALENDAR"].join("\r\n") + "\r\n";
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="brain-dump.ics"', "Cache-Control": "max-age=300", "Access-Control-Allow-Origin": "*" } });
});
