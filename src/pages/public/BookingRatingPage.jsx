import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

export default function BookingRatingPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  
  const [volunteerId, setVolunteerId] = useState(null);
  const [volunteerName, setVolunteerName] = useState('Your Adviser');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    validateRatingLink();
  }, []);

  const validateRatingLink = async () => {
    if (!bookingId || !email || !token) {
      setLoading(false);
      return;
    }

    try {
      const tokenDoc = await getDoc(doc(db, 'cancel_tokens', bookingId));
      if (!tokenDoc.exists()) {
        setLoading(false);
        return;
      }

      const tokenData = tokenDoc.data();
      if (tokenData.email !== email || tokenData.cancel_token !== token)  {
        setLoading(false);
        return;
      }

      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (bookingDoc.exists()) {
        const bookingData = bookingDoc.data();
        setVolunteerId(bookingData.volunteer_id);
        
        if (bookingData.volunteer_id) {
          const volunteerDoc = await getDoc(doc(db, 'volunteers', bookingData.volunteer_id));
          if (volunteerDoc.exists()) {
            setVolunteerName(volunteerDoc.data().full_name || 'Your Adviser');
          }
        }
      }

      const ratingQuery = query(
        collection(db, 'ratings'),
        where('booking_id', '==', bookingId),
        where('user_email', '==', email)
      );
      const ratingSnap = await getDocs(ratingQuery);
      if (!ratingSnap.empty) {
        setSubmitted(true);
      } else {
        setValidToken(true);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select stars');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(collection(db, 'ratings')), {
        booking_id: bookingId,
        volunteer_id: volunteerId,
        user_email: email,
        rating,
        comment: comment.trim() || '',
        created_at: new Date()
      });

      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('volunteer_id', '==', volunteerId)
      );
      const ratingsSnap = await getDocs(ratingsQuery);
      
      let totalRating = 0;
      ratingsSnap.forEach(doc => {
        totalRating += doc.data().rating;
      });
      
      const avgRating = ratingsSnap.size > 0 ? totalRating / ratingsSnap.size : 0;

      await setDoc(doc(db, 'volunteers', volunteerId), {
        average_rating: avgRating,
        rating_count: ratingsSnap.size,
        updated_at: new Date()
      }, { merge: true });

      await setDoc(doc(db, 'cancel_tokens', bookingId), {
        rating_used: true
      }, { merge: true });

      setSubmitted(true);
    } catch (error) {
      alert('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Loading your rating page...</div>
      </div>
    );
  }

  if (!validToken || !volunteerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center p-12 bg-white rounded-3xl shadow-2xl max-w-md mx-4">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Invalid Rating Link</h1>
          <p className="text-gray-600 mb-8">This link may have expired or already been used.</p>
          <a href="/" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700">
            ← Book New Appointment
          </a>
        </div>
      </div>
    );   
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center p-12 bg-white rounded-3xl shadow-2xl max-w-md mx-4">
          <div className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <span className="text-3xl text-white font-bold">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank You!</h1>
          <p className="text-xl text-gray-600 mb-8">Your {rating} star rating for {volunteerName} has been submitted.</p>
          <a href="/" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700">
            Book Another Appointment
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 pt-16">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-16">
          <div className="w-28 h-28 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto mb-8 flex items-center justify-center shadow-2xl">
            <span className="text-4xl">⭐⭐⭐⭐⭐</span>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent mb-6">
            Rate {volunteerName}
          </h1>
          <p className="text-2xl text-gray-600 mb-4">How was your session?</p>
          <p className="text-lg text-yellow-800 font-medium">Takes 30 seconds • Helps others</p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border-4 border-yellow-200">
          {/* Stars */}
          <div className="flex justify-center gap-2 mb-10">
            {[1,2,3,4,5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-5xl transition-all hover:scale-110 ${
                  star <= rating ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>

          {/* Comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: Share your experience (helps others!)"
            maxLength={300}
            rows={4}
            className="w-full mb-8 p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200"
          />
          <p className="text-sm text-gray-500 text-right mb-8">{comment.length}/300</p>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-2xl rounded-2xl border-4 border-yellow-400 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : `Submit ${rating || 0} Stars`}
          </Button>
        </div>
      </div>
    </div>
  );
}
