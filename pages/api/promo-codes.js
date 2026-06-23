
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Unauthorized' });

  const client = await clientPromise;
  const collection = client.db('virgala').collection('promo_codes');

  if (req.method === 'GET') {
    const codes = await collection.find({}).toArray();
    return res.json(codes);
  }

  if (req.method === 'POST') {
    const { percentage, maxUses } = req.body;
    if (!percentage || percentage < 1 || percentage > 100)
      return res.status(400).json({ error: 'Invalid percentage' });
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await collection.insertOne({
      code, percentage, maxUses: maxUses || null, uses: 0, active: true, createdAt: new Date()
    });
    return res.status(201).json({ code });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing ID' });
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.json({ success: true });
  }

  res.status(405).end();
}
