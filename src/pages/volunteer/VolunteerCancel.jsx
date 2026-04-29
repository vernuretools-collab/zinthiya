import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VolunteerCancelButton from '../../pages/volunteer/VolunteerCancelButton';

const VolunteerCancel = () => {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  
  if (!bookingId) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Booking</h1>
          <button 
            onClick={() => navigate('/volunteer/bookings')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="mb-8 inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
        >
          ← Back
        </button>
        <VolunteerCancelButton 
          bookingId={bookingId}
          bookingRef={`ZT-${bookingId.slice(-6)}`}
          onSuccess={() => navigate('/volunteer/bookings')}
        />
      </div>
    </div>
  );
};

export default VolunteerCancel;
