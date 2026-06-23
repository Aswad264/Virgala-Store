
import axios from 'axios';
export async function sendDiscordNotification(embed) {
  await axios.post(process.env.DISCORD_WEBHOOK, embed);
}
