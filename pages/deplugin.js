
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function DePlugin() {
  const [form, setForm] = useState({ discord_name: '', discord_link: '', description: '', estimated_price: '' });
  const [sent, setSent] = useState(false);

  const submit = async e => {
    e.preventDefault();
    await axios.post('/api/deplugin', form);
    setSent(true);
  };

  if (sent) return <div style={{ textAlign: 'center', paddingTop: 100, color: '#e0e0ff' }}><h2>Request sent!</h2><Link href="/">Back</Link></div>;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#02020a' }}>
      <form onSubmit={submit} style={{ background: 'rgba(14,14,24,0.9)', padding: 30, borderRadius: 16, border: '1px solid #2a2a4a', width: 350 }}>
        <h2 style={{ color: '#fff', fontFamily: 'Orbitron' }}>Request Custom Plugin</h2>
        <input type="text" placeholder="Your Discord username" required value={form.discord_name} onChange={e => setForm({ ...form, discord_name: e.target.value })} style={{ width: '100%', padding: 10, marginBottom: 15, background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff' }} />
        <input type="url" placeholder="Discord server invite link" required value={form.discord_link} onChange={e => setForm({ ...form, discord_link: e.target.value })} style={{ width: '100%', padding: 10, marginBottom: 15, background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff' }} />
        <textarea placeholder="Describe plugin..." rows="4" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: 10, marginBottom: 15, background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff' }} />
        <input type="text" placeholder="Estimated price" value={form.estimated_price} onChange={e => setForm({ ...form, estimated_price: e.target.value })} style={{ width: '100%', padding: 10, marginBottom: 15, background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff' }} />
        <button type="submit" style={{ background: '#00f0ff', color: '#000', fontWeight: 'bold', padding: 12, border: 'none', width: '100%', cursor: 'pointer' }}>Send Request</button>
        <div style={{ textAlign: 'center', marginTop: 10 }}><Link href="/">← Back</Link></div>
      </form>
    </div>
  );
}
