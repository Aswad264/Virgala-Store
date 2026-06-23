
import clientPromise from '../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = 'VirgalaJWT2026_!%Xx9Lp2Qr5W';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { pluginId, recipientEmail, promoCode } = req.body;
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const client = await clientPromise;
  const db = client.db('virgala');
  const plugin = await db.collection('plugins').findOne({ _id: new ObjectId(pluginId) });
  if (!plugin) return res.status(404).json({ error: 'Plugin not found' });

  // Apply promo if any
  let price = parseFloat(plugin.price);
  if (promoCode) {
    const promo = await db.collection('promo_codes').findOne({ code: promoCode.toUpperCase(), active: true });
    if (promo) {
      price = price * (1 - promo.percentage / 100);
    }
  }

  const orderId = Math.random().toString(36).substring(2, 15);
  await db.collection('pending_orders').insertOne({
    orderId, pluginId, email: decoded.email, recipientEmail, promoCode, price, isGift: true, createdAt: new Date()
  });

  // Redirect to PayPal
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(process.env.PAYPAL_EMAIL)}&item_name=${encodeURIComponent('Gift: ' + plugin.name)}&amount=${price.toFixed(2)}&currency_code=USD&notify_url=${encodeURIComponent(process.env.NEXT_PUBLIC_URL + '/api/gift-ipn')}&return=${encodeURIComponent(process.env.NEXT_PUBLIC_URL + '/thankyou')}&cancel_return=${encodeURIComponent(process.env.NEXT_PUBLIC_URL)}&custom=${orderId}&no_shipping=1`;
  res.json({ redirectUrl: paypalUrl });
}
