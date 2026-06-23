import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

const SECRET = process.env.ADMIN_SECRET || 'adminmodebyaswad_ib';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('virgala');
  const collection = db.collection('trusted_servers');

  if (req.method === 'GET') {
    const servers = await collection.find({}).sort({ createdAt: -1 }).toArray();
    return res.json(servers);
  }

  if (req.headers['x-admin-secret'] !== SECRET)
    return res.status(403).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { name, discordLink, rating, description } = req.body;
    if (!name || !discordLink || !rating) return res.status(400).json({ error: 'Missing fields' });
    const newServer = { name, discordLink, rating, description: description || '', createdAt: new Date() };
    await collection.insertOne(newServer);
    return res.status(201).json(newServer);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing ID' });
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.json({ success: true });
  }

  res.status(405).end();
}