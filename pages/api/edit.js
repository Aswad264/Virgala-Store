import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(403).send('Unauthorized');

  const { id, name, price, description, subscriberFree, sales } = req.body;

  try {
    const update = { $set: {} };

    if (typeof name !== 'undefined') update.$set.name = name;
    if (typeof price !== 'undefined') update.$set.price = price;
    if (typeof description !== 'undefined') update.$set.description = description;
    if (typeof subscriberFree !== 'undefined') update.$set.subscriberFree = subscriberFree;
    // ✅ new: allow manual sales editing
    if (typeof sales !== 'undefined') update.$set.sales = parseInt(sales) || 0;

    await (await clientPromise).db('virgala').collection('plugins').updateOne(
      { _id: new ObjectId(id) },
      update
    );
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Invalid ID' });
  }
}