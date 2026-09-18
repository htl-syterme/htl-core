// X-Trust + Express example. npm i express @htl-syterme/htl-core
import express from 'express';
import { requireTrust } from '@htl-syterme/htl-core';

const app = express();
app.use(express.json());
const SECRET = process.env.HTL_SECRET;

app.post('/chat', async (req, res) => {
  const { trusted, score } = await requireTrust(req, SECRET);
  // AIR doctrine: annotate, never block. Log the signal, do not reject.
  console.log(`trusted=${trusted} score=${score}`);
  res.json({ ok: true, trusted, score });
});

app.listen(3000);
