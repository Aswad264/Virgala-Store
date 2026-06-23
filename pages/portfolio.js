
import Link from 'next/link';

export default function Portfolio() {
  const services = [
    { name: 'Plugins', ez: '$5', medium: '$10', high: '$20+' },
    { name: 'Bots', ez: '$5', medium: '$10', high: '$20+' },
    { name: 'Skripts', ez: '$5+', medium: '–', high: '–' },
    { name: 'Resource Packs', ez: '–', medium: '–', high: '$20+' },
    { name: 'Custom Recipes', ez: '–', medium: '–', high: '$10+' },
    { name: 'Datapacks', ez: '$5+', medium: '–', high: '–' },
  ];

  return (
    <div style={{ padding: '20px', minHeight: '100vh', color: 'var(--text)' }}>
      <Link href="/" style={{ color: 'var(--accent2)', textDecoration: 'none', fontFamily: 'Orbitron', letterSpacing: '1px' }}>← Back to Store</Link>
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '30px' }}>
        <h1 style={{ fontFamily: 'Orbitron', fontSize: '4rem', color: '#fff', textShadow: '0 0 30px var(--accent2)', letterSpacing: '4px' }}>VIRGALA PORTFOLIO</h1>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '1.4rem', color: '#a0a0c0', maxWidth: '600px', margin: '0 auto' }}>
          I’m a pro plugin maker. High‑quality plugins, bots, skripts, resource packs, and more for cheap.
        </p>
      </div>
      <div style={{ background: 'rgba(14,14,24,0.8)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: '20px', padding: '30px', marginBottom: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px', textAlign: 'left', fontFamily: 'Orbitron' }}>Service</th>
              <th style={{ padding: '10px', textAlign: 'center', fontFamily: 'Orbitron' }}>Ez</th>
              <th style={{ padding: '10px', textAlign: 'center', fontFamily: 'Orbitron' }}>Medium</th>
              <th style={{ padding: '10px', textAlign: 'center', fontFamily: 'Orbitron' }}>High End</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontFamily: 'Rajdhani', fontSize: '1.2rem' }}>{s.name}</td>
                <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'Orbitron', color: 'var(--gold)' }}>{s.ez}</td>
                <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'Orbitron', color: 'var(--gold)' }}>{s.medium}</td>
                <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'Orbitron', color: 'var(--gold)' }}>{s.high}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '20px', textAlign: 'center', color: '#888' }}>PayPal only. Prices negotiable.</p>
      </div>
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <a href="/deplugin" style={{ display: 'inline-block', padding: '12px 30px', background: 'linear-gradient(135deg, var(--accent2), var(--accent1))', color: '#000', fontWeight: 'bold', fontFamily: 'Orbitron', letterSpacing: '1px', borderRadius: '8px', textDecoration: 'none' }}>Request Custom Plugin</a>
      </div>
    </div>
  );
}
