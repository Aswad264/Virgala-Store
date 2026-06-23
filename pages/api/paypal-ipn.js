import axios from 'axios';
import { sendEmailWithAttachment } from '../../lib/email';
import { sendDiscordNotification } from '../../lib/discord';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify IPN with PayPal
  const verifyUrl = 'https://ipnpb.paypal.com/cgi-bin/webscr';
  const params = new URLSearchParams(req.body);
  params.append('cmd', '_notify-validate');
  try {
    const resp = await axios.post(verifyUrl, params.toString());
    if (resp.data.trim() !== 'VERIFIED') return res.status(400).send('Not verified');
  } catch { return res.status(500).send('IPN verify failed'); }

  const { payment_status, custom, payer_email, receiver_email, txn_id, item_name } = req.body;
  if (payment_status !== 'Completed') return res.status(200).send('Ignored');
  if (receiver_email?.toLowerCase() !== process.env.PAYPAL_EMAIL?.toLowerCase()) return res.status(200).send('Mismatch');

  const client = await clientPromise;
  const db = client.db('virgala');
  const order = await db.collection('pending_orders').findOne({ orderId: custom });
  if (!order) return res.status(200).send('Order not found');

  const plugin = await db.collection('plugins').findOne({ _id: new ObjectId(order.pluginId) });
  if (!plugin) return res.status(200).send('Plugin gone');

  // Send email with attachment
  try {
    await sendEmailWithAttachment(
      order.email,
      `Your purchase: ${plugin.name}`,
      `Thank you for buying ${plugin.name} ($${plugin.price}).${order.discount ? ` Discount: ${order.discount}%.` : ''}`,
      Buffer.from(plugin.fileData, 'base64'),
      plugin.filename
    );
    await db.collection('pending_orders').deleteOne({ orderId: custom });

    // ✅ Increment sales count
    await db.collection('plugins').updateOne(
      { _id: new ObjectId(order.pluginId) },
      { $inc: { sales: 1 } }
    );

    // Increment promo code usage if used
    if (order.promoCode) {
      await db.collection('promo_codes').updateOne(
        { code: order.promoCode },
        { $inc: { uses: 1 } }
      );
    }
  } catch (e) { console.error('Email error:', e); }

  // Discord notification
  await sendDiscordNotification({
    content: '💰 **New Purchase!**',
    embeds: [{
      title: plugin.name,
      fields: [
        { name: 'Buyer Email', value: payer_email || order.email, inline: true },
        { name: 'Price', value: `$${plugin.price}`, inline: true },
        { name: 'Discount', value: order.discount ? `${order.discount}%` : 'None', inline: true },
        { name: 'Transaction ID', value: txn_id, inline: false },
      ],
      color: 0x00ff00,
    }],
  });

  res.status(200).send('OK');
}