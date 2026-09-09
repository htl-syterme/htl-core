import { createClient } from "npm:@supabase/supabase-js@2";

const TRAPS = [
  "/admin", "/api/v1/secret-keys", "/debug/config",
  "/wp-login.php", "/.env", "/htl-core/internal",
  "/api/keys", "/config", "/.git"
];

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = (req.headers.get("x-forwarded-for") || "0.0.0.0").split(",")[0].trim();
  const path = new URL(req.url).pathname;
  const ua = req.headers.get("user-agent") || "";

  const isTrapped = TRAPS.some(t => path.includes(t));

  if (isTrapped) {
    await sb.from("security_events").insert({
      event_type: "honeypot",
      ip: ip,
      path: path,
      user_agent: ua,
      score: 100,
      details: { headers: Object.fromEntries(req.headers), trap: path }
    });

    await sb.from("ip_blacklist").upsert({
      ip: ip,
      reason: "honeypot_triggered",
      score: 100,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    });

    const resendKey = Deno.env.get("RESEND_KEY") ?? "";
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: "diengamine.htl@gmail.com",
          subject: "[X-Trust ALERT] Honeypot triggered by " + ip,
          html: "<p>IP: " + ip + "</p><p>Path: " + path + "</p><p>UA: " + ua + "</p>"
        })
      });
    }

    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    return new Response(
      JSON.stringify({ error: "Unauthorized", keys: ["fake_htl_xxx", "fake_htl_yyy"] }),
      { status: 401, headers: cors }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
