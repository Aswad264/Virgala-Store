
import { useAuth } from '../lib/auth';
import Link from 'next/link';

export default function Subscribe() {
  const { isVip } = useAuth();

  return (
    <div style={{ padding: '40px', minHeight: '100vh', color: 'var(--text)' }}>
      <Link href="/" style={{ color: 'var(--accent2)', fontFamily: 'Orbitron', textDecoration: 'none' }}>← Back to Store</Link>
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <h1 style={{ fontFamily: 'Orbitron', fontSize: '3rem', color: '#fff', textShadow: '0 0 20px var(--accent2)' }}>VIRGALA SUBSCRIPTIONS</h1>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '40px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(14,14,24,0.8)', borderRadius: '16px', padding: '30px', border: '1px solid var(--border)', maxWidth: '350px', width: '100%' }}>
            <h2 style={{ fontFamily: 'Orbitron', color: 'var(--accent2)' }}>Monthly</h2>
            <p style={{ fontSize: '3rem', color: 'var(--gold)' }}>$30<span style={{ fontSize: '1rem' }}>/mo</span></p>
            <ul style={{ listStyle: 'none', textAlign: 'left', fontSize: '1.1rem', lineHeight: '2' }}>
              <li>✅ Free access to selected plugins</li>
              <li>✅ Exclusive promo codes</li>
              <li>✅ 50% OFF any plugin</li>
              <li>✅ Priority Discord support</li>
            </ul>
            <a href={`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions&business=${process.env.NEXT_PUBLIC_PAYPAL_EMAIL}&item_name=Virgala%20Monthly%20Subscription&a3=30.00&p3=1&t3=M&src=1&srt=52&no_note=1&no_shipping=1&currency_code=USD`}
               target="_blank"
               style={{ display: 'block', marginTop: '20px', padding: '12px', background: 'linear-gradient(135deg, var(--accent2), var(--accent1))', color: '#000', fontWeight: 'bold', fontFamily: 'Orbitron', borderRadius: '8px', textDecoration: 'none', textAlign: 'center' }}>Subscribe Monthly</a>
          </div>

          <div style={{ background: 'rgba(14,14,24,0.8)', borderRadius: '16px', padding: '30px', border: '2px solid #ffd700', maxWidth: '350px', width: '100%', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#ffd700', color: '#000', padding: '5px 15px', borderRadius: '20px', fontFamily: 'Orbitron', fontWeight: 'bold' }}>BEST VALUE</span>
            <h2 style={{ fontFamily: 'Orbitron', color: '#ffd700', marginTop: '15px' }}>VIP Lifetime</h2>
            <p style={{ fontSize: '3rem', color: '#ffd700' }}>${process.env.NEXT_PUBLIC_VIP_PRICE || 100}<span style={{ fontSize: '1rem' }}> one-time</span></p>
            <ul style={{ listStyle: 'none', textAlign: 'left', fontSize: '1.1rem', lineHeight: '2' }}>
              <li>👑 All pre‑made plugins FREE forever</li>
              <li>👑 50% OFF custom plugins</li>
              <li>👑 Priority support & early access</li>
              <li>👑 Exclusive VIP badge</li>
            </ul>
            {isVip ? (
              <p style={{ marginTop: '20px', color: '#30d158', fontFamily: 'Orbitron' }}>You are already VIP!</p>
            ) : (
              <a href={`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${process.env.NEXT_PUBLIC_PAYPAL_EMAIL}&item_name=Virgala%20VIP%20Lifetime&amount=${process.env.NEXT_PUBLIC_VIP_PRICE || 100}&currency_code=USD&notify_url=${process.env.NEXT_PUBLIC_URL}/api/vip-ipn&return=${process.env.NEXT_PUBLIC_URL}/thankyou&cancel_return=${process.env.NEXT_PUBLIC_URL}&no_shipping=1`}
                 target="_blank"
                 style={{ display: 'block', marginTop: '20px', padding: '12px', background: '#ffd700', color: '#000', fontWeight: 'bold', fontFamily: 'Orbitron', borderRadius: '8px', textDecoration: 'none', textAlign: 'center' }}>Become VIP</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
