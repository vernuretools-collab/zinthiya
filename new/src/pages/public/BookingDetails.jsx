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
      const bookingReference = `ZT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      console.log('Creating booking with data:', {
        ...formData,
        volunteer_id: bookingData.volunteer_id,
        support_category: bookingData.support_category,
        consultation_type: bookingData.consultation_type,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time
      });

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

      navigate('/booking/confirmation');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <SOSButton />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">
              Your Details
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600">
              Please provide your contact information
            </p>
          </div>

          {/* Booking Summary Card */}
          <Card className="mb-4 sm:mb-6 border-0 shadow-md sm:shadow-lg bg-gradient-to-r from-blue-100 to-indigo-100">
            <CardHeader className="p-4 sm:p-5 md:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-800">
                Booking Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm md:text-base text-slate-700 font-medium">
                <strong className="text-indigo-700">Date:</strong>{' '}
                {bookingData.start_time && format(new Date(bookingData.start_time), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-700 font-medium">
                <strong className="text-indigo-700">Time:</strong>{' '}
                {bookingData.start_time && format(new Date(bookingData.start_time), 'h:mm a')} -{' '}
                {bookingData.end_time && format(new Date(bookingData.end_time), 'h:mm a')}
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-700 font-medium">
                <strong className="text-indigo-700">Type:</strong>{' '}
                {bookingData.consultation_type === 'phone' ? 'Phone Call' : 'In-Person'}
              </p>
            </CardContent>
          </Card>

          {/* Main Form Card */}
          <Card className="border-0 shadow-md sm:shadow-lg bg-white">
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8 pt-4 sm:pt-5 md:pt-6">
              <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                
                {/* Full Name Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="victim_name" 
                    className="text-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                    <span>Full Name *</span>
                  </Label>
                  <Input
                    className="border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 bg-indigo-50/50 text-sm sm:text-base h-11 sm:h-12"
                    id="victim_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.victim_name}
                    onChange={(e) => handleChange('victim_name', e.target.value)}
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="victim_email" 
                    className="text-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <span>Email Address *</span>
                  </Label>
                  <Input
                    className="border-2 border-blue-200 focus:border-blue-400 focus:ring-blue-400 bg-blue-50/50 text-sm sm:text-base h-11 sm:h-12"
                    id="victim_email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.victim_email}
                    onChange={(e) => handleChange('victim_email', e.target.value)}
                    required
                  />
                  <p className="text-xs sm:text-sm text-slate-600 ml-1">
                    We'll send your confirmation to this email
                  </p>
                </div>

                {/* Phone Number Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="victim_phone" 
                    className="text-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                    <span>Phone Number *</span>
                  </Label>
                  <Input
                    className="border-2 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 bg-emerald-50/50 text-sm sm:text-base h-11 sm:h-12"
                    id="victim_phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.victim_phone}
                    onChange={(e) => handleChange('victim_phone', e.target.value)}
                    pattern="^\+?[1-9]\d{1,14}$"
                    title="Please enter a valid international phone number (e.g., +1234567890, +447123456789)"
                    required
                  />
                  <p className="text-xs sm:text-sm text-slate-600 ml-1">
                    Include country code (e.g., +44 for UK, +1 for US, +91 for India)
                  </p>
                </div>

                {/* Preferred Language Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="preferred_language" 
                    className="text-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 flex-shrink-0" />
                    <span>Preferred Language *</span>
                  </Label>
                  <Select
                    value={formData.preferred_language}
                    onValueChange={(value) => handleChange('preferred_language', value)}
                  >
                    <SelectTrigger 
                      id="preferred_language" 
                      className="border-2 border-violet-200 focus:border-violet-400 focus:ring-violet-400 bg-violet-50/50 text-sm sm:text-base h-11 sm:h-12"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, lang]) => (
                        <SelectItem key={code} value={code} className="text-sm sm:text-base">
                          {lang.flag} {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Notes Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="victim_note" 
                    className="text-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 flex-shrink-0" />
                    <span>Additional Notes (Optional)</span>
                  </Label>
                  <Textarea
                    className="border-2 border-rose-200 focus:border-rose-400 focus:ring-rose-400 bg-rose-50/50 text-sm sm:text-base min-h-[100px] sm:min-h-[120px]"
                    id="victim_note"
                    placeholder="Is there anything specific you'd like the volunteer to know?"
                    value={formData.victim_note}
                    onChange={(e) => handleChange('victim_note', e.target.value)}
                    maxLength={500}
                    rows={4}
                  />
                  <p className="text-xs sm:text-sm text-slate-600 ml-1">
                    {formData.victim_note.length}/500 characters
                  </p>
                </div>

                {/* Privacy Notice */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <strong className="text-indigo-700">Privacy Notice:</strong> Your information will be kept confidential and only shared with your assigned volunteer. We take your privacy seriously.
                  </p>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/booking/select-time')}
                    className="w-full sm:flex-1 order-2 sm:order-1
                              border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400
                              text-slate-700 font-semibold
                              h-12 sm:h-14
                              text-sm sm:text-base md:text-lg
                              transition-all duration-300
                              shadow-sm hover:shadow-md"
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:flex-1 order-1 sm:order-2
                              bg-gradient-to-r from-indigo-500 to-blue-600 
                              hover:from-indigo-600 hover:to-blue-700 
                              text-white font-bold 
                              h-12 sm:h-14
                              text-sm sm:text-base md:text-lg
                              shadow-md hover:shadow-xl 
                              transition-all duration-300
                              disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Notice */}
          <div className="mt-4 sm:mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              💡 <strong className="text-amber-700">Note:</strong> After booking, you'll receive a confirmation with all the details. Please save this for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
