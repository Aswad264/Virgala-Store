
import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = 'VirgalaJWT2026_!%Xx9Lp2Qr5W';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, referralCode } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const client = await clientPromise;
  const db = client.db('virgala');
  const users = db.collection('users');

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    email: email.toLowerCase(),
    password: hashed,
    subscription: false,
    vip: false,
    referralCode: uuidv4().slice(0, 8),
    referredBy: null,
    createdAt: new Date()
  };

  // Process referral
  if (referralCode) {
    const referrer = await users.findOne({ referralCode });
    if (referrer) {
      newUser.referredBy = referrer.email;
      // Generate a 5% one-time promo code for the referrer
      const promoCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await db.collection('promo_codes').insertOne({
        code: promoCode,
        percentage: 5,
        maxUses: 1,
        uses: 0,
        active: true,
        createdAt: new Date(),
        note: `Referral reward from ${email}`
      });
      // Email the referrer
      try {
        const { sendEmail } = require('../../../lib/email');
        await sendEmail(
          referrer.email,
          'You earned a 5% discount!',
          `Someone signed up with your referral link! Use code ${promoCode} for 5% off your next purchase.`
        );
      } catch (e) { console.error('Referral email failed:', e); }
    }
  }

  await users.insertOne(newUser);

  const token = jwt.sign({ email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
  res.setHeader('Set-Cookie', serialize('token', token, { path: '/', httpOnly: true, maxAge: 7 * 24 * 60 * 60 }));
  res.status(201).json({ user: { email: newUser.email, subscription: false, vip: false } });
}
