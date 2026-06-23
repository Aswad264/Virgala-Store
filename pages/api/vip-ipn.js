
import axios from 'axios';
import { sendEmail } from '../../lib/email';
import { sendDiscordNotification } from '../../lib/discord';
import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const verifyUrl = 'https://ipnpb.paypal.com/cgi-bin/webscr';
  const params = new URLSearchParams(req.body);
  params.append('cmd', '_notify-validate');
  try {
    const resp = await axios.post(verifyUrl, params.toString());
    if (resp.data.trim() !== 'VERIFIED') return res.status(400).send('Not verified');
  } catch { return res.status(500).send('IPN verify failed'); }

  const { payment_status, payer_email, receiver_email, txn_id } = req.body;
  if (payment_status !== 'Completed') return res.status(200).send('Ignored');
  if (receiver_email?.toLowerCase() !== process.env.PAYPAL_EMAIL?.toLowerCase()) return res.status(200).send('Mismatch');

  const client = await clientPromise;
  const db = client.db('virgala');
  // VIP is lifetime, so we set vip: true on the user
  await db.collection('users').updateOne(
    { email: payer_email.toLowerCase() },
    { $set: { vip: true } }
  );

  try {
    await sendEmail(payer_email, 'Welcome to Virgala VIP!', 'You are now a VIP member. All pre‑made plugins are free for you forever!');
  } catch (e) { console.error('VIP email error:', e); }

  await sendDiscordNotification({
    content: '👑 **New VIP Member!**',
    embeds: [{
      title: 'VIP Purchase',
      fields: [
        { name: 'Email', value: payer_email, inline: true },
        { name: 'Transaction ID', value: txn_id, inline: false }
      ],
      color: 0xffd700
    }]
  });
  res.status(200).send('OK');
}
