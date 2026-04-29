import React, { useState } from 'react';
import { functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';

const VolunteerCancelButton = ({ bookingId, bookingRef, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      const sendNotification = httpsCallable(functions, 'sendVolunteerCancelNotification');
      await sendNotification({ bookingId, reason });

      alert('Booking cancelled successfully!');
      onSuccess();
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-3xl font-bold text-red-600 mb-6 text-center">
        Cancel Booking {bookingRef}
      </h2>
      <div className="space-y-6">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you cancelling this booking?"
          className="w-full p-4 border border-gray-300 rounded-xl resize-vertical min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={loading}
        />
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-red-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-0.5 transition-all"
          >
            {loading ? 'Cancelling...' : `Cancel Booking ${bookingRef}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolunteerCancelButton;
