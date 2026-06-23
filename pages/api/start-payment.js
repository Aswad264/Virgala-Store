
import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { pluginId, email, orderId, promoCode, discount } = req.body;
  if (!pluginId || !email || !orderId) return res.status(400).json({ error: 'Missing fields' });

  const client = await clientPromise;
  const db = client.db('virgala');
  const promos = db.collection('promo_codes');

  let finalDiscount = 0;
  if (promoCode) {
    const code = await promos.findOne({ code: promoCode.toUpperCase(), active: true });
    if (!code) return res.status(400).json({ error: 'Invalid promo code' });
    if (code.maxUses !== null && code.uses >= code.maxUses)
      return res.status(400).json({ error: 'Promo code usage limit reached' });
    finalDiscount = code.percentage;
  }

  await db.collection('pending_orders').insertOne({
    orderId, pluginId, email, promoCode: promoCode || null, discount: finalDiscount, createdAt: new Date()
  });
  res.json({ success: true });
}
