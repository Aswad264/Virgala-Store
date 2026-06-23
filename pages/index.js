import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../lib/auth';

const SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'adminmodebyaswad_ib';

export default function Home() {
  const { user, logout, isSubscribed, isVip } = useAuth();
  const [plugins, setPlugins] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoPercentage, setPromoPercentage] = useState('20');
  const [promoMaxUses, setPromoMaxUses] = useState('');
  const [users, setUsers] = useState([]);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => { axios.get('/api/plugins').then(r => setPlugins(r.data)); }, []);
  useEffect(() => { if (admin) { fetchPromos(); fetchUsers(); } }, [admin]);
  useEffect(() => {
    if (user) axios.get('/api/auth/referral-code').then(r => setReferralCode(r.data.code));
  }, [user]);

  const fetchPromos = async () => {
    try { const res = await axios.get('/api/promo-codes', { headers: { 'x-admin-secret': SECRET } }); setPromoCodes(res.data); } catch {}
  };
  const fetchUsers = async () => {
    try { const res = await axios.get('/api/admin/users', { headers: { 'x-admin-secret': SECRET } }); setUsers(res.data); } catch {}
  };

  useEffect(() => {
    let buf = '';
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      buf += e.key; if (buf.length > 100) buf = buf.slice(-100);
      if (buf.includes(SECRET) && !admin) { setAdmin(true); setAdminVisible(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [admin]);

  const upload = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const subFree = e.target.subFree?.checked;
    if (subFree) form.append('subscriberFree', 'true');
    await axios.post('/api/upload', form, { headers: { 'x-admin-secret': SECRET } });
    const res = await axios.get('/api/plugins');
    setPlugins(res.data);
  };

  const del = async id => {
    if (!confirm('Delete?')) return;
    await axios.delete('/api/delete', { data: { id }, headers: { 'x-admin-secret': SECRET } });
    setPlugins(plugins.filter(p => p._id !== id));
  };

  const edit = async (id, data) => {
    await axios.put('/api/edit', { id, ...data }, { headers: { 'x-admin-secret': SECRET } });
    setPlugins(plugins.map(p => p._id === id ? { ...p, ...data } : p));
    setEditModal(null);
  };

  const generatePromo = async () => {
    const percentage = parseInt(promoPercentage, 10);
    if (isNaN(percentage) || percentage < 1 || percentage > 100) return alert('Invalid percentage');
    try {
      await axios.post('/api/promo-codes', { percentage, maxUses: promoMaxUses ? parseInt(promoMaxUses, 10) : null }, { headers: { 'x-admin-secret': SECRET } });
      setPromoPercentage('20'); setPromoMaxUses('');
      fetchPromos();
    } catch (err) { alert('Failed to generate code'); }
  };

  const deletePromo = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    await axios.delete(`/api/promo-codes?id=${id}`, { headers: { 'x-admin-secret': SECRET } });
    fetchPromos();
  };

  const toggleSubscription = async (email, currentSub) => {
    await axios.put('/api/admin/users', { email, subscription: !currentSub }, { headers: { 'x-admin-secret': SECRET } });
    fetchUsers();
  };

  const toggleVip = async (email, currentVip) => {
    await axios.put('/api/admin/users', { email, vip: !currentVip }, { headers: { 'x-admin-secret': SECRET } });
    fetchUsers();
  };

  // Helper to update sales manually
  const updateSales = async (id, newSales) => {
    try {
      await axios.put('/api/edit', { id, sales: parseInt(newSales) || 0 }, { headers: { 'x-admin-secret': SECRET } });
      setPlugins(plugins.map(p => p._id === id ? { ...p, sales: parseInt(newSales) || 0 } : p));
    } catch {}
  };

  return (
    <div className="content">
      <nav className="navbar">
        <div className="logo">VIRGALA STORE</div>
        <div className="nav-links">
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/subscribe">Subscribe</Link>
          <Link href="/trusted-servers">Trusted</Link> {/* new */}
          <Link href="/deplugin">Custom</Link>
          {user ? (
            <>
              <span style={{ color: '#888', marginLeft: '20px' }}>{user.email}</span>
              {isVip && <span style={{ color: '#ffd700', marginLeft: '10px' }}>👑 VIP</span>}
              <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontFamily: 'Orbitron' }}>Logout</button>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
          {admin && <span id="admin-indicator" style={{marginLeft:20,padding:'4px 14px',background:'rgba(0,240,255,0.1)',border:'1px solid #00f0ff',borderRadius:20,color:'#00f0ff',fontWeight:'bold'}}>ADMIN MODE</span>}
        </div>
      </nav>
      <div className="hero">
        <h2>VIRGALA</h2>
        <p>Unbeatable plugins — instant delivery.</p>
      </div>

      {user && referralCode && (
        <div style={{ textAlign: 'center', margin: '20px 0', padding: '10px', background: 'rgba(0,240,255,0.1)', borderRadius: '8px', border: '1px solid var(--accent2)' }}>
          <p style={{ color: '#fff', fontFamily: 'Rajdhani' }}>
            Your referral link: <strong style={{ color: 'var(--accent2)' }}>{process.env.NEXT_PUBLIC_URL}/signup?ref={referralCode}</strong>
          </p>
          <p style={{ color: '#888' }}>Share this link – when someone signs up, you get a 5% discount code!</p>
        </div>
      )}

      <div className={`admin-panel ${adminVisible ? 'visible' : ''}`}>
        {/* ... Upload form unchanged ... */}
        <h3>🔐 Admin Upload</h3>
        <form className="form-grid" onSubmit={upload}>
          <input type="text" name="name" placeholder="Plugin Name" required />
          <input type="text" name="price" placeholder="Price (USD)" defaultValue="5.00" />
          <textarea name="description" placeholder="Description" rows="3"></textarea>
          <label style={{ gridColumn: 'span 2', color: '#fff', margin: '10px 0' }}>
            <input type="checkbox" name="subFree" /> Free for subscribers
          </label>
          <input type="file" name="file" required style={{gridColumn:'span 2'}} />
          <button type="submit">⬆️ Upload & List</button>
        </form>

        {/* Promo Codes section unchanged */}
        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <h3 style={{ color: 'var(--accent2)', fontFamily: 'Orbitron', marginBottom: '15px' }}>🏷️ Promo Codes</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input type="number" placeholder="Discount %" value={promoPercentage} onChange={e => setPromoPercentage(e.target.value)} style={{ width: '120px', padding: '8px', background: '#0c0c18', border: '1px solid var(--border)', color: '#fff', borderRadius: '8px' }} />
            <input type="number" placeholder="Max uses (optional)" value={promoMaxUses} onChange={e => setPromoMaxUses(e.target.value)} style={{ width: '140px', padding: '8px', background: '#0c0c18', border: '1px solid var(--border)', color: '#fff', borderRadius: '8px' }} />
            <button onClick={generatePromo} style={{ padding: '8px 16px', background: 'var(--accent2)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Orbitron' }}>Generate Code</button>
          </div>
          {promoCodes.length > 0 && (
            <div style={{ background: '#0c0c18', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
              {promoCodes.map(pc => (
                <div key={pc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: '#fff', fontFamily: 'Rajdhani' }}>{pc.code} – {pc.percentage}% off (uses: {pc.uses}{pc.maxUses ? `/${pc.maxUses}` : ''})</span>
                  <button onClick={() => deletePromo(pc._id)} style={{ background: 'transparent', border: '1px solid #ff3c5a', color: '#ff3c5a', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Subscriptions unchanged */}
        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <h3 style={{ color: 'var(--accent2)', fontFamily: 'Orbitron', marginBottom: '15px' }}>👤 User Subscriptions</h3>
          {users.length === 0 ? <p style={{ color: '#888' }}>No users yet.</p> : (
            <div style={{ background: '#0c0c18', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
              {users.map(u => (
                <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: '#fff' }}>{u.email}</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => toggleSubscription(u.email, u.subscription)} style={{ padding: '4px 12px', background: u.subscription ? 'var(--accent2)' : 'transparent', border: u.subscription ? 'none' : '1px solid var(--accent2)', color: u.subscription ? '#000' : 'var(--accent2)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{u.subscription ? 'Sub Active' : 'Sub Inactive'}</button>
                    <button onClick={() => toggleVip(u.email, u.vip)} style={{ padding: '4px 12px', background: u.vip ? '#ffd700' : 'transparent', border: u.vip ? 'none' : '1px solid #ffd700', color: u.vip ? '#000' : '#ffd700', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{u.vip ? 'VIP' : 'Set VIP'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-title">🔥 Available Plugins</div>
      {plugins.length === 0 ? <div className="empty-state">⚡ No plugins yet.</div> : (
        <div className="plugin-grid">
          {plugins.map(p => (
            <div className="plugin-card" key={p._id}>
              <h4><Link href={`/product/${p._id}`}>{p.name}</Link></h4>
              <p className="desc">{p.description}</p>
              <div className="price">${p.price}</div>
              <div style={{display:'flex',gap:10}}>
                <Link href={`/product/${p._id}`} className="btn btn-buy">💰 Buy</Link>
                <Link href={`/product/${p._id}`} className="btn btn-details">📄 Details</Link>
              </div>
              {admin && (
                <>
                  <div style={{marginTop:10,display:'flex',gap:8}}>
                    <button className="btn btn-edit" onClick={() => setEditModal({_id:p._id,name:p.name,price:p.price,description:p.description,subscriberFree:p.subscriberFree || false})}>✏️ Edit</button>
                    <button className="btn btn-delete" onClick={() => del(p._id)}>🗑️ Delete</button>
                  </div>
                  {/* ✅ Manual sales input for admins */}
                  <div style={{ marginTop: 5, color: '#888', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>Sales:</span>
                    <input
                      type="number"
                      defaultValue={p.sales || 0}
                      style={{ width: 60, background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', padding: '2px 5px', borderRadius: '4px' }}
                      onBlur={(e) => updateSales(p._id, e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div style={{position:'fixed',zIndex:2000,top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.8)',display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'#0e0e18',border:'1px solid #00f0ff',borderRadius:16,padding:20,width:400}}>
            <h3 style={{color:'#00f0ff'}}>Edit Plugin</h3>
            <form onSubmit={e => { e.preventDefault(); const name = e.target.name.value; const price = e.target.price.value; const desc = e.target.description.value; const subFree = e.target.subFree.checked; edit(editModal._id, {name,price,description:desc, subscriberFree:subFree}); }}>
              <input name="name" defaultValue={editModal.name} required style={{width:'100%',padding:10,marginBottom:10,background:'#0c0c18',border:'1px solid #2a2a4a',color:'#fff'}} />
              <input name="price" defaultValue={editModal.price} required style={{width:'100%',padding:10,marginBottom:10,background:'#0c0c18',border:'1px solid #2a2a4a',color:'#fff'}} />
              <textarea name="description" defaultValue={editModal.description} rows="3" style={{width:'100%',padding:10,marginBottom:10,background:'#0c0c18',border:'1px solid #2a2a4a',color:'#fff'}}></textarea>
              <label style={{ display: 'block', color: '#fff', margin: '10px 0' }}>
                <input type="checkbox" name="subFree" defaultChecked={editModal.subscriberFree} /> Free for subscribers
              </label>
              <button type="submit" className="btn btn-buy">Save</button>
              <button type="button" className="btn btn-delete" onClick={()=>setEditModal(null)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      <footer>© 2026 Virgala Store | <Link href="/deplugin" style={{color:'var(--accent2)'}}>Request Custom Plugin</Link></footer>
    </div>
  );
}