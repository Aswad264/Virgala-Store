
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Unauthorized' });
  const client = await clientPromise;
  const db = client.db('virgala');
  const users = db.collection('users');

  if (req.method === 'GET') {
    const all = await users.find({}).project({ password: 0 }).toArray();
    return res.json(all);
  }

  if (req.method === 'PUT') {
    const { email, subscription, vip } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const update = {};
    if (typeof subscription !== 'undefined') update.subscription = !!subscription;
    if (typeof vip !== 'undefined') update.vip = !!vip;
    await users.updateOne({ email }, { $set: update });
    return res.json({ success: true });
  }

  res.status(405).end();
}
