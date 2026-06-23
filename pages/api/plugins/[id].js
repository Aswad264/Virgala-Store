
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const client = await clientPromise;
    const plugin = await client.db('virgala').collection('plugins').findOne({ _id: new ObjectId(id) });
    if (!plugin) return res.status(404).json({ error: 'Not found' });
    res.json(plugin);
  } catch { res.status(400).json({ error: 'Invalid ID' }); }
}
