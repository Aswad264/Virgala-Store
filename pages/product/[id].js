import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function Product() {
  const router = useRouter();
  const { id } = router.query;
  const [plugin, setPlugin] = useState(null);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    if (id) {
      axios.get(`/api/plugins/${id}`).then(r => setPlugin(r.data));
      axios.get(`/api/ratings?pluginId=${id}`).then(r => setRatings(r.data));
    }
  }, [id]);

  if (!plugin) return <div className="content">Loading...</div>;

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#02020a' }}>
      <div style={{ background: 'rgba(14,14,24,0.9)', backdropFilter: 'blur(20px)', border: '1px solid #2a2a4a', borderRadius: 24, padding: 50, maxWidth: 800, width: '90%', boxShadow: '0 0 60px rgba(0,240,255,0.2)' }}>
        <h1 style={{ fontFamily: 'Orbitron', fontSize: '3rem', color: '#fff', textShadow: '0 0 20px #00f0ff' }}>{plugin.name}</h1>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffd700', textShadow: '0 0 20px rgba(255,215,0,0.8)', margin: '20px 0' }}>${plugin.price}</div>
        {/* Sales count */}
        <p style={{ color: '#888', fontSize: '1rem', marginTop: '-10px' }}>{plugin.sales || 0} sold</p>
        {/* Average rating */}
        {averageRating && (
          <p style={{ color: 'var(--gold)', fontSize: '1rem' }}>⭐ {averageRating} ({ratings.length} review{ratings.length !== 1 ? 's' : ''})</p>
        )}

        <div style={{ color: '#a0a0c0', fontSize: '1.3rem', lineHeight: 1.6, margin: '30px 0', whiteSpace: 'pre-wrap' }}>{plugin.description}</div>

        <div style={{ marginTop: 40, display: 'flex', gap: 20 }}>
          <Link href={`/buy/${plugin._id}`} className="btn btn-buy" style={{ padding: '16px 30px', fontSize: '1.2rem' }}>💳 Buy Now</Link>
          <Link href="/" className="btn" style={{ border: '1px solid #00f0ff', color: '#00f0ff', padding: '16px 30px', fontSize: '1.2rem' }}>← Back</Link>
        </div>

        {/* Ratings section */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #2a2a4a', paddingTop: '30px' }}>
          <h3 style={{ color: 'var(--accent2)', fontFamily: 'Orbitron', marginBottom: '15px' }}>Ratings</h3>
          {ratings.length === 0 ? (
            <p style={{ color: '#888' }}>No ratings yet.</p>
          ) : (
            ratings.map(r => (
              <div key={r._id} style={{ background: '#0e0e18', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '1px solid #2a2a4a' }}>
                <p style={{ color: 'var(--gold)' }}>{'⭐'.repeat(r.stars)}{r.stars < 5 ? '☆'.repeat(5 - r.stars) : ''} – <strong>{r.name}</strong></p>
                {r.description && <p style={{ color: '#a0a0c0' }}>{r.description}</p>}
                {r.serverLink && <a href={r.serverLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', fontSize: '0.9rem' }}>Server Link</a>}
              </div>
            ))
          )}
          <Link href={`/rate/${plugin._id}`} className="btn" style={{ display: 'inline-block', marginTop: '15px', border: '1px solid var(--accent2)', color: 'var(--accent2)', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none' }}>
            Rate this Plugin
          </Link>
        </div>
      </div>
    </div>
  );
}