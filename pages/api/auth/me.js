
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';

const JWT_SECRET = 'VirgalaJWT2026_!%Xx9Lp2Qr5W';

export default async function handler(req, res) {
  const { token } = req.cookies;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await clientPromise;
    const user = await client.db('virgala').collection('users').findOne({ email: decoded.email });
    if (!user) return res.json({ user: null });
    res.json({ user: { email: user.email, subscription: user.subscription, vip: user.vip } });
  } catch {
    res.json({ user: null });
  }
}
