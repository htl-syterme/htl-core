import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: current } = await sb.rpc("read_secret", { secret_name: "htl_secret_current" });

    const newBytes = new Uint8Array(32);
    crypto.getRandomValues(newBytes);
    const newSecret = Array.from(newBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const newVersion = "v" + Date.now();

    if (current) {
      await sb.rpc("upsert_secret", {
        secret_name: "htl_secret_previous",
        secret_value: current,
        secret_desc: "Previous HTL secret overlap"
      });
    }

    await sb.rpc("upsert_secret", {
      secret_name: "htl_secret_current",
      secret_value: newSecret,
      secret_desc: "Current HTL secret " + newVersion
    });

    await sb.from("secret_rotations").insert({
      secret_name: "htl_secret",
      version: newVersion,
      status: "success",
      details: { overlap_hours: 2 }
    });

    const resendKey = Deno.env.get("RESEND_KEY") ?? "";
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: "diengamine.htl@gmail.com",
          subject: "[X-Trust] Secret rotated OK " + newVersion,
          html: "<p>Secret rotated successfully. Version: " + newVersion + "</p>"
        })
      });
    }

    return new Response(JSON.stringify({ ok: true, version: newVersion }), { headers: cors });

  } catch (err) {
    await sb.from("secret_rotations").insert({
      secret_name: "htl_secret",
      version: "failed",
      status: "failed",
      details: { error: String(err) }
    });
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
