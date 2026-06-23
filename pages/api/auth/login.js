
import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const JWT_SECRET = 'VirgalaJWT2026_!%Xx9Lp2Qr5W';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const client = await clientPromise;
  const db = client.db('virgala');
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.setHeader('Set-Cookie', serialize('token', token, { path: '/', httpOnly: true, maxAge: 7 * 24 * 60 * 60 }));
  res.json({ user: { email: user.email, subscription: user.subscription, vip: user.vip } });
}
