import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useBookingStore } from '../../stores/bookingStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import SOSButton from '../../components/shared/SOSButton';
import { LANGUAGES } from '../../lib/utils';
import { Loader2, User, Mail, Phone, MessageSquare, Globe } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingDetails() {
  const navigate = useNavigate();
  const { bookingData, setBookingData, resetBookingData } = useBookingStore();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    victim_name: '',
    victim_email: '',
    victim_phone: '',
    preferred_language: 'en',
    victim_note: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!bookingData.volunteer_id || !bookingData.start_time) {
      alert('Please complete the previous steps first.');
      navigate('/booking/support-type');
      return;
    }

    setSubmitting(true);

    try {
      // Generate unique booking reference
      const bookingReference = `ZT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      console.log('Creating booking with data:', {
        ...formData,
        volunteer_id: bookingData.volunteer_id,
        support_category: bookingData.support_category,
        consultation_type: bookingData.consultation_type,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time
      });

      // Create booking directly in Firestore
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        booking_reference: bookingReference,
        volunteer_id: bookingData.volunteer_id,
        support_category: bookingData.support_category,
        consultation_type: bookingData.consultation_type,
        start_time: Timestamp.fromDate(new Date(bookingData.start_time)),
        end_time: Timestamp.fromDate(new Date(bookingData.end_time)),
        victim_name: formData.victim_name,
        victim_email: formData.victim_email,
        victim_phone: formData.victim_phone,
        preferred_language: formData.preferred_language,
        victim_note: formData.victim_note || '',
        status: 'upcoming',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      console.log('Booking created successfully:', bookingRef.id);

      // Update store with confirmation data
      setBookingData({
        ...bookingData,
        booking_reference: bookingReference,
        booking_id: bookingRef.id,
        victim_name: formData.victim_name,
        victim_email: formData.victim_email,
        victim_phone: formData.victim_phone,
        preferred_language: formData.preferred_language,
        victim_note: formData.victim_note
      });

      // Navigate to confirmation page
      navigate('/booking/confirmation');

      // Reset store after a delay
      setTimeout(() => {
        resetBookingData();
      }, 1000);

    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again. Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingData.volunteer_id) {
    navigate('/booking/support-type');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <SOSButton />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Details</h1>
            <p className="text-gray-600">
              Please provide your contact information
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Date:</strong> {bookingData.start_time && format(new Date(bookingData.start_time), 'EEEE, MMMM d, yyyy')}
              </p>
              <p>
                <strong>Time:</strong> {bookingData.start_time && format(new Date(bookingData.start_time), 'h:mm a')} - {bookingData.end_time && format(new Date(bookingData.end_time), 'h:mm a')}
              </p>
              <p>
                <strong>Type:</strong> {bookingData.consultation_type === 'phone' ? 'Phone Call' : 'In-Person'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="victim_name">
                    <User className="inline h-4 w-4 mr-2" />
                    Full Name *
                  </Label>
                  <Input
                    id="victim_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.victim_name}
                    onChange={(e) => handleChange('victim_name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="victim_email">
                    <Mail className="inline h-4 w-4 mr-2" />
                    Email Address *
                  </Label>
                  <Input
                    id="victim_email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.victim_email}
                    onChange={(e) => handleChange('victim_email', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll send your confirmation to this email
                  </p>
                </div>

                <div>
                  <Label htmlFor="victim_phone">
                    <Phone className="inline h-4 w-4 mr-2" />
                    Phone Number *
                  </Label>
                  <Input
                    id="victim_phone"
                    type="tel"
                    placeholder=""
                    value={formData.victim_phone}
                    onChange={(e) => handleChange('victim_phone', e.target.value)}
                    pattern="^\+?[1-9]\d{1,14}$"
                    title="Please enter a valid international phone number (e.g., +1234567890, +447123456789)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +44 for UK, +1 for US, +91 for India)
                  </p>
                </div>

                <div>
                  <Label htmlFor="preferred_language">
                    <Globe className="inline h-4 w-4 mr-2" />
                    Preferred Language *
                  </Label>
                  <Select
                    value={formData.preferred_language}
                    onValueChange={(value) => handleChange('preferred_language', value)}
                  >
                    <SelectTrigger id="preferred_language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, lang]) => (
                        <SelectItem key={code} value={code}>
                          {lang.flag} {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="victim_note">
                    <MessageSquare className="inline h-4 w-4 mr-2" />
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="victim_note"
                    placeholder="Is there anything specific you'd like the volunteer to know?"
                    value={formData.victim_note}
                    onChange={(e) => handleChange('victim_note', e.target.value)}
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.victim_note.length}/500 characters
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Privacy Notice:</strong> Your information will be kept confidential and only shared with your assigned volunteer. We take your privacy seriously.
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/booking/select-time')}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              💡 <strong>Note:</strong> After booking, you'll receive a confirmation with all the details. Please save this for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
