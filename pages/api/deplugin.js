
import { sendDiscordNotification } from '../../lib/discord';
export default async function handler(req, res) {
  const { discord_name, discord_link, description, estimated_price } = req.body;
  await sendDiscordNotification({
    content: '📩 **New De‑Plugin Request**',
    embeds: [{
      title: 'Request Details',
      fields: [
        { name: 'Discord Name', value: discord_name, inline: true },
        { name: 'Discord Server', value: discord_link, inline: true },
        { name: 'Estimated Price', value: estimated_price || 'Not given', inline: true },
        { name: 'Description', value: description }
      ],
      color: 0x00ff00
    }]
  });
  res.json({ success: true });
}
