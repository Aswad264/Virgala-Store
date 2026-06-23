
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import Link from 'next/link';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.error || 'Login failed'); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
      <form onSubmit={handleSubmit} style={{ background: 'rgba(14,14,24,0.9)', backdropFilter: 'blur(15px)', padding: '40px', borderRadius: '20px', border: '1px solid #2a2a4a', textAlign: 'center', width: '350px', color: '#fff' }}>
        <h2 style={{ fontFamily: 'Orbitron', marginBottom: '20px' }}>Login</h2>
        {error && <p style={{ color: '#ff3c5a' }}>{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', margin: '10px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', margin: '10px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} required />
        <button type="submit" style={{ background: 'var(--accent2)', color: '#000', fontWeight: 'bold', padding: '14px', border: 'none', width: '100%', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Orbitron', marginTop: '10px' }}>Login</button>
        <p style={{ marginTop: '15px' }}><Link href="/signup" style={{ color: 'var(--accent2)' }}>Create account</Link></p>
      </form>
    </div>
  );
}
