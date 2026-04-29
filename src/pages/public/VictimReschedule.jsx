import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import VictimRescheduleButton from './VictimRescheduleButton';

const VictimReschedule = () => {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const victimEmail = searchParams.get('email');
  const cancelToken = searchParams.get('token');

  if (!bookingId || !victimEmail || !cancelToken) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Reschedule Link</h1>
          <p className="text-gray-500 mb-6">
            This link is invalid or has expired. Please use the reschedule link from your confirmation email.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 text-sm font-medium shadow-sm transition-all"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-gray-500 text-sm">
            Rescheduling for: <span className="font-semibold text-gray-700">{victimEmail}</span>
          </p>
        </div>

        {/* Reschedule Form */}
        <VictimRescheduleButton
          bookingId={bookingId}
          bookingRef={`ZT-${bookingId.slice(-6).toUpperCase()}`}
          victimEmail={victimEmail}
          cancelToken={cancelToken}
          onSuccess={() => navigate('/')}
        />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Zinthiya Ganeshpanchan Trust · 12 Bishop Street, Leicester LE1 6AF · 0116 254 5168
        </p>

      </div>
    </div>
  );
};

export default VictimReschedule;
