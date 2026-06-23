
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../../lib/auth';

export default function Buy() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isSubscribed, isVip } = useAuth();
  const [plugin, setPlugin] = useState(null);
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [giftEmail, setGiftEmail] = useState('');
  const [isGift, setIsGift] = useState(false);

  useEffect(() => { if (id) axios.get(`/api/plugins/${id}`).then(r => setPlugin(r.data)); }, [id]);
  useEffect(() => { if (user) setEmail(user.email); }, [user]);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoApplied(false);
    setDiscount(0);
    try {
      const res = await axios.get(`/api/validate-promo?code=${encodeURIComponent(promoCode.trim())}`);
      if (res.data.valid) {
        setDiscount(res.data.percentage);
        setPromoApplied(true);
      } else {
        setPromoError(res.data.message || 'Invalid code');
      }
    } catch { setPromoError('Failed to validate code'); }
  };

  const discountedPrice = plugin ? (plugin.price * (1 - discount / 100)).toFixed(2) : 0;

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!email) return alert('Please enter your email.');
    setLoading(true);

    // VIP / subscriber‑free
    if ((isVip || (isSubscribed && plugin?.subscriberFree)) && !isGift) {
      try {
        await axios.post('/api/deliver-subscriber-free', { pluginId: id, email });
        alert('Plugin sent! Check your email.');
        router.push('/');
        return;
      } catch (err) { alert(err.response?.data?.error || 'Delivery failed'); }
      finally { setLoading(false); }
      return;
    }

    // Gift flow
    if (isGift) {
      if (!giftEmail) return alert('Enter recipient email');
      try {
        const res = await axios.post('/api/buy-plugin-code', {
          pluginId: id,
          recipientEmail: giftEmail,
          promoCode: promoApplied ? promoCode.trim().toUpperCase() : null
        });
        if (res.data.redirectUrl) window.location.href = res.data.redirectUrl;
      } catch (err) { alert(err.response?.data?.error || 'Gift setup failed'); }
      finally { setLoading(false); }
      return;
    }

    // Normal purchase
    if (promoCode.trim() && !promoApplied) {
      setPromoError('Click "Apply Code" first');
      setLoading(false);
      return;
    }

    const orderId = Math.random().toString(36).substring(2, 15);
    try {
      await axios.post('/api/start-payment', {
        pluginId: id, email, orderId,
        promoCode: promoApplied ? promoCode.trim().toUpperCase() : null,
        discount
      });
    } catch (err) { alert(err.response?.data?.error || 'Payment setup failed'); setLoading(false); return; }

    const finalAmount = discountedPrice;
    const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(process.env.NEXT_PUBLIC_PAYPAL_EMAIL)}&item_name=${encodeURIComponent(plugin.name)}&amount=${finalAmount}&currency_code=USD&notify_url=${encodeURIComponent(process.env.NEXT_PUBLIC_URL + '/api/paypal-ipn')}&return=${encodeURIComponent(process.env.NEXT_PUBLIC_URL + '/thankyou')}&cancel_return=${encodeURIComponent(process.env.NEXT_PUBLIC_URL)}&custom=${orderId}&no_shipping=1`;
    window.location.href = paypalUrl;
  };

  if (!plugin) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#02020a' }}>
      <form onSubmit={handleBuy} style={{ background: 'rgba(14,14,24,0.9)', backdropFilter: 'blur(15px)', padding: '40px', borderRadius: '20px', border: '1px solid #2a2a4a', textAlign: 'center', width: '400px', color: '#fff' }}>
        <h2 style={{ fontFamily: 'Orbitron', marginBottom: '20px' }}>Buy {plugin.name}</h2>

        {isVip && !isGift && <p style={{ color: '#ffd700', marginBottom: '10px' }}>👑 VIP – free for you!</p>}
        {isSubscribed && plugin.subscriberFree && !isGift && !isVip && (
          <div style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid var(--accent2)', borderRadius: '8px', padding: '10px', margin: '10px 0' }}>
            🎉 Free for subscribers!
          </div>
        )}

        {!(isVip || (isSubscribed && plugin.subscriberFree)) || isGift ? (
          <p style={{ color: '#ffd700', fontSize: '2rem', margin: '10px 0' }}>
            ${discountedPrice}
            {discount > 0 && <span style={{ textDecoration: 'line-through', color: '#888', marginLeft: '10px', fontSize: '1.2rem' }}>${plugin.price}</span>}
          </p>
        ) : (
          <p style={{ color: '#30d158', fontSize: '1.5rem', margin: '10px 0' }}>Free</p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', margin: '10px 0', color: '#888', cursor: 'pointer' }}>
          <input type="checkbox" checked={isGift} onChange={e => setIsGift(e.target.checked)} /> Buy as gift
        </label>

        {isGift && (
          <input type="email" placeholder="Recipient email" value={giftEmail} onChange={e => setGiftEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', margin: '10px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
        )}

        <input type="email" placeholder="Your email for receipt" required value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px', margin: '10px 0', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />

        {!(isVip || (isSubscribed && plugin.subscriberFree) || isGift) && (
          <>
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <input type="text" placeholder="Promo code (optional)" value={promoCode} onChange={e => setPromoCode(e.target.value)}
                style={{ flex: 1, padding: '12px', background: '#0c0c18', border: '1px solid #2a2a4a', color: '#fff', borderRadius: '8px' }} />
              <button type="button" onClick={validatePromo} style={{ padding: '0 12px', background: 'var(--accent2)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Orbitron' }}>Apply</button>
            </div>
            {promoError && <p style={{ color: '#ff3c5a', marginTop: '5px' }}>{promoError}</p>}
            {promoApplied && <p style={{ color: '#30d158', marginTop: '5px' }}>{discount}% discount applied!</p>}
          </>
        )}

        <button type="submit" disabled={loading} style={{ background: loading ? '#555' : 'linear-gradient(135deg, #00f0ff, #ff3c5a)', color: loading ? '#888' : '#000', fontWeight: 'bold', padding: '14px', border: 'none', width: '100%', borderRadius: '8px', fontFamily: 'Orbitron', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '20px', fontSize: '1.1rem' }}>
          {loading ? 'Processing...' : isGift ? 'Pay with PayPal' : (isVip || (isSubscribed && plugin.subscriberFree)) && !isGift ? 'Get Free' : 'Proceed to PayPal'}
        </button>
        <Link href="/" style={{ color: '#00f0ff', marginTop: '15px', display: 'block' }}>Cancel</Link>
      </form>
    </div>
  );
}
