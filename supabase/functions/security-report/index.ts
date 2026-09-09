import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: events } = await sb.from("security_events")
    .select("event_type, score, ip, created_at")
    .gte("created_at", since);

  const { data: rotations } = await sb.from("secret_rotations")
    .select("*").gte("created_at", since);

  const { data: blacklist } = await sb.from("ip_blacklist")
    .select("ip, reason, score").limit(10);

  const total = events?.length || 0;
  const honeypots = events?.filter(e => e.event_type === "honeypot").length || 0;
  const replays = events?.filter(e => e.event_type === "replay_nonce").length || 0;
  const rateLimits = events?.filter(e => e.event_type === "rate_limit").length || 0;
  const rotationOk = rotations?.filter(r => r.status === "success").length || 0;

  const html = `
<h2>X-Trust Security Report</h2>
<h3>Last 24h</h3>
<ul>
  <li>Total events: ${total}</li>
  <li>Honeypot triggers: ${honeypots}</li>
  <li>Replay attacks blocked: ${replays}</li>
  <li>Rate limits hit: ${rateLimits}</li>
  <li>Secret rotations OK: ${rotationOk}</li>
</ul>
<h3>Active Blacklist</h3>
<ul>${blacklist?.map(b => "<li>" + b.ip + " — " + b.reason + "</li>").join("") || "<li>None</li>"}</ul>
<p>System: OPERATIONAL</p>
  `;

  const resendKey = Deno.env.get("RESEND_KEY") ?? "";
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: "diengamine.htl@gmail.com",
        subject: "[X-Trust] Daily Security Report",
        html: html
      })
    });
  }

  return new Response(
    JSON.stringify({ ok: true, total, honeypots, replays, rotationOk }),
    { headers: cors }
  );
});
