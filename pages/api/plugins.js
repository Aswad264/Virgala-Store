
import clientPromise from '../../lib/mongodb';
export default async function handler(req, res) {
  const client = await clientPromise;
  const plugins = await client.db('virgala').collection('plugins').find({}).toArray();
  res.json(plugins);
}
