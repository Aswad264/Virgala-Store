import clientPromise from '../../lib/mongodb';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(403).send('Unauthorized');

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Parse error' });

    const name = fields.name?.[0] || 'Unnamed';
    const desc = fields.description?.[0] || '';
    const price = fields.price?.[0] || '0.00';
    const subscriberFree = fields.subscriberFree?.[0] === 'true';
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: 'No file' });

    const fileBuffer = fs.readFileSync(file.filepath);
    const client = await clientPromise;
    const result = await client.db('virgala').collection('plugins').insertOne({
      name,
      description: desc,
      price,
      subscriberFree,
      filename: file.originalFilename,
      fileData: fileBuffer.toString('base64'),
      createdAt: new Date(),
    });

    // Discord announcement (optional)
    try {
      const { sendDiscordNotification } = require('../../lib/discord');
      await sendDiscordNotification({
        content: '🔥 **New Plugin Released!**',
        embeds: [{
          title: name,
          description: desc + `\n\n💰 $${price}`,
          url: `${process.env.NEXT_PUBLIC_URL}/product/${result.insertedId}`,
          color: 0x00ff00,
        }],
      });
    } catch {}

    res.status(201).json({ id: result.insertedId });
  });
}