import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../lib/auth';

const SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'adminmodebyaswad_ib';

export default function TrustedServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [name, setName] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [rating, setRating] = useState(5);
  const [desc, setDesc] = useState('');

  useEffect(() => {
    axios.get('/api/trusted-servers').then(r => setServers(r.data));
    let buf = '';
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      buf += e.key; if (buf.length > 100) buf = buf.slice(-100);
      if (buf.includes(SECRET)) setAdmin(true);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const addServer = async (e) => {
    e.preventDefault();
    await axios.post('/api/trusted-servers', { name, discordLink, rating, description: desc }, { headers: { 'x-admin-secret': SECRET } });
    const res = await axios.get('/api/trusted-servers');
    setServers(res.data);
    setName(''); setDiscordLink(''); setRating(5); setDesc('');
  };

  const deleteServer = async (id) => {
    await axios.delete(`/api/trusted-servers?id=${id}`, { headers: { 'x-admin-secret': SECRET } });
    setServers(servers.filter(s => s._id !== id));
  };

  return (
    <div className="content" style={{ color: 'var(--text)' }}>
      <h1 style={{ fontFamily: 'Orbitron', color: 'var(--accent2)', textAlign: 'center', marginTop: '40px' }}>
        Trusted Servers
      </h1>

      {admin && (
        <div style={{ background: 'rgba(14,14,24,0.8)', padding: '20px', borderRadius: '16px', margin: '20px auto', maxWidth: '500px' }}>
          <h3 style={{ color: 'var(--accent2)' }}>Add Server</h3>
          <form onSubmit={addServer}>
            <input type="text" placeholder="Server Name" value={name} onChange={e => setName(e.target.value)} required
              style={{ width: '100%', padding: '10px', margin: '5px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
            <input type="text" placeholder="Discord Invite Link" value={discordLink} onChange={e => setDiscordLink(e.target.value)} required
              style={{ width: '100%', padding: '10px', margin: '5px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
            <input type="number" placeholder="Rating (1-5)" value={rating} onChange={e => setRating(e.target.value)} min="1" max="5"
              style={{ width: '100%', padding: '10px', margin: '5px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
            <textarea placeholder="Short description" value={desc} onChange={e => setDesc(e.target.value)}
              style={{ width: '100%', padding: '10px', margin: '5px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent2)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {servers.map(s => (
          <div key={s._id} style={{ background: 'rgba(14,14,24,0.8)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'Orbitron', color: '#fff' }}>{s.name}</h3>
            <p style={{ color: 'var(--gold)' }}>{'⭐'.repeat(s.rating)}{s.rating < 5 ? '☆'.repeat(5 - s.rating) : ''}</p>
            <p style={{ color: '#a0a0c0' }}>{s.description}</p>
            <a href={s.discordLink} target="_blank" style={{ color: 'var(--accent2)', textDecoration: 'none', fontSize: '0.9rem' }}>Join Discord</a>
            {admin && (
              <button onClick={() => deleteServer(s._id)} style={{ marginTop: '10px', background: 'transparent', border: '1px solid #ff3c5a', color: '#ff3c5a', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}