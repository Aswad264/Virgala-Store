
import axios from 'axios';
import { sendEmailWithAttachment } from '../../lib/email';
import { sendDiscordNotification } from '../../lib/discord';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const verifyUrl = 'https://ipnpb.paypal.com/cgi-bin/webscr';
  const params = new URLSearchParams(req.body);
  params.append('cmd', '_notify-validate');
  try {
    const resp = await axios.post(verifyUrl, params.toString());
    if (resp.data.trim() !== 'VERIFIED') return res.status(400).send('Not verified');
  } catch { return res.status(500).send('IPN verify failed'); }

  const { payment_status, custom, receiver_email, txn_id } = req.body;
  if (payment_status !== 'Completed') return res.status(200).send('Ignored');
  if (receiver_email?.toLowerCase() !== process.env.PAYPAL_EMAIL?.toLowerCase()) return res.status(200).send('Mismatch');

  const client = await clientPromise;
  const db = client.db('virgala');
  const order = await db.collection('pending_orders').findOne({ orderId: custom });
  if (!order) return res.status(200).send('Order not found');
  const plugin = await db.collection('plugins').findOne({ _id: new ObjectId(order.pluginId) });
  if (!plugin) return res.status(200).send('Plugin gone');

  // Send to recipient
  try {
    await sendEmailWithAttachment(order.recipientEmail, `You received a gift: ${plugin.name}`,
      `Someone bought you ${plugin.name}! Enjoy!`, Buffer.from(plugin.fileData, 'base64'), plugin.filename);
    await db.collection('pending_orders').deleteOne({ orderId: custom });
  } catch (e) { console.error('Gift email error:', e); }

  await sendDiscordNotification({
    content: '🎁 **New Gift Purchase!**',
    embeds: [{
      title: plugin.name,
      fields: [
        { name: 'From', value: order.email, inline: true },
        { name: 'To', value: order.recipientEmail, inline: true },
        { name: 'Transaction ID', value: txn_id, inline: false }
      ],
      color: 0xff00ff
    }]
  });
  res.status(200).send('OK');
}
