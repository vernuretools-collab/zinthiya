import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useBookingStore } from '../../stores/bookingStore';
import { OFFICE_ADDRESS, BOOKINGS_EMAIL, CRISIS_HELPLINE } from '../../lib/utils';
import { Check, Calendar, Phone, MapPin, Mail, Home } from 'lucide-react';

// ✅ Safe: handles both Date objects and ISO strings — always displays UK time
const formatUKDate = (dateVal) => {
  if (!dateVal) return '';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ✅ Safe: handles both Date objects and ISO strings — always UK time, 12hr AM/PM
const formatUKTime = (dateVal) => {
  if (!dateVal) return '';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return d.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData, resetBookingData } = useBookingStore();

  const [savedBookingData, setSavedBookingData] = useState(null);

  useEffect(() => {
    if (bookingData.booking_reference) {
      setSavedBookingData({
        booking_reference: bookingData.booking_reference,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        consultation_type: bookingData.consultation_type,
      });
    } else {
      return;
    }

    window.history.pushState(null, document.title, window.location.href);

    const handleBackButton = () => {
      window.history.pushState(null, document.title, window.location.href);
    };

    window.addEventListener('popstate', handleBackButton);
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [bookingData, navigate, location]);

  // Add to Google Calendar
  const handleOpenGoogleCalendar = () => {
    if (!savedBookingData) return;

    const start = savedBookingData.start_time instanceof Date
      ? savedBookingData.start_time
      : new Date(savedBookingData.start_time);

    const end = savedBookingData.end_time instanceof Date
      ? savedBookingData.end_time
      : new Date(savedBookingData.end_time);

    const toGCalDate = (d) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Zinthiya Trust Appointment',
      details: 'Your appointment with Zinthiya Ganeshpanchan Trust',
      location: savedBookingData.consultation_type === 'in_person'
        ? OFFICE_ADDRESS
        : 'Phone Call',
      dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    });

    window.open(`https://www.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  // Email Confirmation
  const handleEmailConfirmation = () => {
    if (!savedBookingData) return;

    const subject = `Appointment confirmation - ${savedBookingData.booking_reference}`;
    const dateStr = formatUKDate(savedBookingData.start_time);
    const timeStr = `${formatUKTime(savedBookingData.start_time)} - ${formatUKTime(savedBookingData.end_time)}`;
    const locationText = savedBookingData.consultation_type === 'in_person'
      ? OFFICE_ADDRESS
      : 'Phone call (we will call you)';

    const bodyLines = [
      'Hello,',
      '',
      'I would like to confirm my appointment:',
      `Booking reference: ${savedBookingData.booking_reference}`,
      `Date: ${dateStr}`,
      `Time: ${timeStr}`,
      `Type: ${savedBookingData.consultation_type === 'in_person' ? 'In-person' : 'Phone'}`,
      `Location: ${locationText}`,
      '',
      'Thank you.',
    ];

    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = `mailto:${BOOKINGS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const handleBookAnother = () => {
    resetBookingData();
    navigate('/booking/support-type');
  };

  const handleGoHome = () => {
    resetBookingData();
    navigate('/');
  };

  const displayData = savedBookingData || bookingData;
  if (!displayData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pt-16 sm:pt-20">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-4xl mx-auto">

          {/* Success Header */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-green-500 rounded-full mb-3 sm:mb-4 shadow-lg">
              <Check className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              Your Appointment is Confirmed!
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600">
              We're here to support you
            </p>
          </div>

          {/* Appointment Details Card */}
          <Card className="mb-4 sm:mb-6 border-0 shadow-md sm:shadow-lg">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl">
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-3 sm:space-y-4 md:space-y-5">

              {/* Booking Reference */}
              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-700 mb-1">
                    Booking Reference
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 break-all">
                    {displayData.booking_reference}
                  </p>
                </div>
              </div>

              {/* ✅ Date & Time — always UK time */}
              <div className="flex items-start gap-3 sm:gap-4">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base md:text-lg text-gray-700 mb-1">
                    Date & Time
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-gray-700">
                    {formatUKDate(displayData.start_time)}
                  </p>
                  <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
                    {formatUKTime(displayData.start_time)}
                    {' '}–{' '}
                    {formatUKTime(displayData.end_time)}
                  </p>
                </div>
              </div>

              {/* Consultation Type */}
              {displayData.consultation_type === 'phone' ? (
                <div className="flex items-start gap-3 sm:gap-4">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base md:text-lg text-gray-700 mb-1">
                      Phone Call
                    </p>
                    <p className="text-sm sm:text-base text-gray-600">
                      We'll call you at your number
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 sm:gap-4">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base md:text-lg text-gray-700 mb-1">
                      In-Person Appointment
                    </p>
                    <p className="text-sm sm:text-base text-gray-600 mb-2">
                      {OFFICE_ADDRESS}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 hover:underline text-xs sm:text-sm font-medium"
                    >
                      Get Directions →
                    </a>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            <Button
              onClick={handleOpenGoogleCalendar}
              variant="outline"
              className="w-full h-auto py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm md:text-base font-semibold border-2 hover:bg-slate-50 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2"
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-center">Add to Calendar</span>
            </Button>

            {/* <Button
              onClick={handleEmailConfirmation}
              variant="outline"
              className="w-full h-auto py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm md:text-base font-semibold border-2 hover:bg-slate-50 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-center">Email Confirmation</span>
            </Button> */}

            <Button
              onClick={handleBookAnother}
              variant="outline"
              className="w-full h-auto py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm md:text-base font-semibold border-2 hover:bg-slate-50 flex items-center justify-center"
            >
              <span className="text-center">Book Another</span>
            </Button>

            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full h-auto py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm md:text-base font-semibold border-2 hover:bg-slate-50 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-center">Home</span>
            </Button>
          </div>

          {/* Email Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
            <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed">
              📧 <strong>Confirmation sent:</strong> A confirmation email has been sent to your email address.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}