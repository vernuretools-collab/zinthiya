// pages/UserBookings.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';  // Adjust path to your firebase config
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function UserBookings() {
  const [bookings, setBookings] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmailInput, setShowEmailInput] = useState(false);

  // 🔥 Try localStorage first, then manual input
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    } else {
      setShowEmailInput(true);
    }
    setLoading(false);
  }, []);

  // 🔥 Load bookings when email is set
  useEffect(() => {
    if (!userEmail) return;

    const q = query(
      collection(db, 'bookings'),
      where('victim_email', '==', userEmail),
      where('status', 'in', ['upcoming', 'active']),
      orderBy('start_time')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [userEmail]);

  const setEmailAndLoad = (email) => {
    localStorage.setItem('userEmail', email);
    setUserEmail(email);
    setShowEmailInput(false);
  };

  const cancelBooking = async (bookingId, bookingRef) => {
    if (!confirm(`Cancel ${bookingRef}?`)) return;

    try {
      const functions = getFunctions();
      const onUserCancelBooking = httpsCallable(functions, 'onUserCancelBooking');
      
      await onUserCancelBooking({
        bookingId,
        userEmail,
        reason: prompt('Reason (optional):') || 'No reason provided'
      });
      
      alert('✅ Cancelled! Volunteer notified.');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  // Email input screen
  if (showEmailInput || !userEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 400, width: '100%', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>My Bookings</h1>
          <p style={{ color: '#64748b', marginBottom: '24px', textAlign: 'center' }}>Enter email used for booking</p>
          
          <input
            type="email"
            placeholder="your.email@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            style={{
              width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px',
              fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box'
            }}
          />
          
          <button
            onClick={() => userEmail && setEmailAndLoad(userEmail)}
            disabled={!userEmail}
            style={{
              width: '100%', padding: '16px', background: userEmail ? '#3b82f6' : '#94a3b8',
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600',
              cursor: userEmail ? 'pointer' : 'not-allowed'
            }}
          >
            Load My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>My Bookings</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>{userEmail}</p>
        </div>
        <button 
          onClick={() => setShowEmailInput(true)}
          style={{ color: '#3b82f6', background: 'none', border: 'none', fontSize: '14px' }}
        >
          Change Email
        </button>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>No Upcoming Bookings</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>No active or upcoming bookings found</p>
          <a 
            href="/book" 
            style={{
              display: 'inline-block', background: '#3b82f6', color: 'white',
              padding: '14px 28px', borderRadius: '12px', textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Book New Appointment
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.map((booking) => (
            <div key={booking.id} style={{
              background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    {booking.booking_reference}
                  </h3>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 16px 0' }}>
                    {booking.start_time?.toDate().toLocaleString('en-GB')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0 }}>
                      {booking.consultation_type === 'phone' ? '📞 Phone Call' : '🏥 In-Person'}
                    </p>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', background: '#fef3c7', 
                      color: '#92400e', borderRadius: '20px', fontSize: '14px', fontWeight: '600'
                    }}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => cancelBooking(booking.id, booking.booking_reference)}
                  style={{
                    background: '#ef4444', color: 'white', padding: '12px 24px',
                    border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  🚫 Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
