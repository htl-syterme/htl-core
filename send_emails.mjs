
const emails = [
  { to: "danny@librechat.ai", subject: "Stolen keys on public LibreChat instances", name: "Danny" },
  { to: "dev@chronark.com", subject: "The human signal Unkey policies lack", name: "Andreas" },
  { to: "calcsam@gmail.com", subject: "Human signal for Mastra spending caps", name: "Sam" },
  { to: "rambat1010@gmail.com", subject: "Scripted queries inflating AnythingLLM costs", name: "Tim" },
  { to: "willy.douhard@gmail.com", subject: "Bot sessions burning Chainlit LLM calls", name: "Willy" },
  { to: "daniel@getzep.com", subject: "Free tier abuse on Zep credits", name: "Daniel" },
  { to: "joshua.greaves@gmail.com", subject: "Bot requests biasing Martian router stats", name: "Joshua" },
  { to: "hello@agno.com", subject: "Agent loops without human proof", name: "Ashpreet" },
  { to: "reachtotj@gmail.com", subject: "Bot memories polluting Mem0 free tier", name: "Taranjeet" },
  { to: "rogeriocfj+npm@gmail.com", subject: "Mixed bot/human traces in LangWatch", name: "Rogerio" }
];

const bloc = `X-Trust adds one signed HMAC-SHA256 header proving a human — not a bot — is behind the request. Verified server-side in 3 lines, no captcha, no KYC, no PII.

Live proof: https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter
OSS: https://github.com/htl-syterme/htl-core`;

async function send(to, subject, name, body) {
  const key = process.env.RESEND_KEY;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: to,
      subject: subject,
      text: body
    })
  });
  const data = await res.json();
  console.log(name, res.status, data.id || data.message);
}

(async () => {
  for (const e of emails) {
    const body = `Hi ${e.name},\n\n${bloc}\n\nReply "no" and I won't follow up.\n\nDieng — HTL\ndiengamine.htl@gmail.com`;
    await send(e.to, e.subject, e.name, body);
    await new Promise(r => setTimeout(r, 2000));
  }
})();
