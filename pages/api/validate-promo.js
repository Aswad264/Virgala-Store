
import clientPromise from '../../lib/mongodb';
export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ valid: false, message: 'No code provided' });
  const client = await clientPromise;
  const promo = await client.db('virgala').collection('promo_codes').findOne({ code: code.toUpperCase(), active: true });
  if (!promo) return res.json({ valid: false, message: 'Invalid or expired code' });
  if (promo.maxUses !== null && promo.uses >= promo.maxUses)
    return res.json({ valid: false, message: 'Code usage limit reached' });
  res.json({ valid: true, percentage: promo.percentage });
}
