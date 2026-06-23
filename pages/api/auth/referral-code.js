
import jwt from 'jsonwebtoken';
import clientPromise from '../../../lib/mongodb';

const JWT_SECRET = 'VirgalaJWT2026_!%Xx9Lp2Qr5W';

export default async function handler(req, res) {
  const { token } = req.cookies;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await clientPromise;
    const user = await client.db('virgala').collection('users').findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ code: user.referralCode });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
