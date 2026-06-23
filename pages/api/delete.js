
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) return res.status(403).send('Unauthorized');
  const { id } = req.body;
  try {
    await (await clientPromise).db('virgala').collection('plugins').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch { res.status(400).json({ error: 'Invalid ID' }); }
}
