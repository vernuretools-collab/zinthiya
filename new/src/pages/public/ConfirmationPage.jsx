import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import SOSButton from '../../components/shared/SOSButton';
import { useBookingStore } from '../../stores/bookingStore';
import { OFFICE_ADDRESS, BOOKINGS_EMAIL, CRISIS_HELPLINE } from '../../lib/utils';
import { Check, Calendar, Phone, MapPin, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { bookingData } = useBookingStore();

  useEffect(() => {
    if (!bookingData.booking_reference) {
      navigate('/');
    }
  }, [bookingData, navigate]);

  const downloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${format(new Date(bookingData.start_time), "yyyyMMdd'T'HHmmss")}
DTEND:${format(new Date(bookingData.end_time), "yyyyMMdd'T'HHmmss")}
SUMMARY:Zinthiya Trust Appointment
DESCRIPTION:Your appointment with Zinthiya Ganeshpanchan Trust
LOCATION:${bookingData.consultation_type === 'in_person' ? OFFICE_ADDRESS : 'Phone Call'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zinthiya-appointment-${bookingData.booking_reference}.ics`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <SOSButton />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
              <Check className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Appointment is Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              We're here to support you
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <p className="font-semibold">Booking Reference</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {bookingData.booking_reference}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <p className="font-semibold">Date & Time</p>
                  <p className="text-gray-700">
                    {bookingData.start_time && format(new Date(bookingData.start_time), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-gray-700">
                    {bookingData.start_time && format(new Date(bookingData.start_time), 'h:mm a')} -
                    {bookingData.end_time && format(new Date(bookingData.end_time), ' h:mm a')}
                  </p>
                </div>
              </div>

              {bookingData.consultation_type === 'phone' ? (
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold">Phone Call</p>
                    <p className="text-gray-700">
                      We'll call you at your number
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-semibold">In-Person Appointment</p>
                    <p className="text-gray-700">{OFFICE_ADDRESS}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Get Directions →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Button onClick={downloadICS} variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Add to Calendar
            </Button>
            <Button variant="outline" className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Email Confirmation
            </Button>
            <Button onClick={() => navigate('/')} className="w-full">
              Book Another
            </Button>
          </div>

          <Card>
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">Need to Reschedule or Cancel?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please contact us as soon as possible if you need to make changes to your appointment.
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${BOOKINGS_EMAIL}`} className="text-blue-600 hover:underline">
                    {BOOKINGS_EMAIL}
                  </a>
                </p>
                <p>
                  <strong>Phone:</strong>{' '}
                  <a href={`tel:${CRISIS_HELPLINE}`} className="text-blue-600 hover:underline">
                    {CRISIS_HELPLINE}
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              📧 A confirmation email has been sent to your email address.
              You'll also receive reminders 24 hours and 1 hour before your appointment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

