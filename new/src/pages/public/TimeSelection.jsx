import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import SOSButton from '../../components/shared/SOSButton';
import { useBookingStore } from '../../stores/bookingStore';
import { OFFICE_ADDRESS } from '../../lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { Calendar, Phone, MapPin, Loader2 } from 'lucide-react';

export default function TimeSelection() {
  const navigate = useNavigate();
  const { bookingData, setBookingData } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [consultationType, setConsultationType] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchVolunteerData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchVolunteerData = async () => {
    try {
      const volunteerDoc = await getDocs(
        query(collection(db, 'volunteers'), where('__name__', '==', bookingData.volunteer_id))
      );
      if (!volunteerDoc.empty) {
        setVolunteer({ id: volunteerDoc.docs[0].id, ...volunteerDoc.docs[0].data() });
      }
    } catch (error) {
      console.error('Error fetching volunteer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const dayOfWeek = date.getDay();
      const q = query(
        collection(db, 'volunteer_availability'),
        where('volunteer_id', '==', bookingData.volunteer_id),
        where('is_available', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const slots = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.is_recurring && data.day_of_week === dayOfWeek) {
          const startHour = parseInt(data.start_time.split(':')[0]);
          const endHour = parseInt(data.end_time.split(':')[0]);
          
          for (let hour = startHour; hour < endHour; hour++) {
            slots.push({
              time: `${hour.toString().padStart(2, '0')}:00`,
              available: true
            });
            slots.push({
              time: `${hour.toString().padStart(2, '0')}:30`,
              available: true
            });
          }
        }
      });
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const isDateAvailable = (date) => {
    const today = startOfDay(new Date());
    return !isBefore(date, today) && date <= addDays(today, 30);
  };

  const handleNext = () => {
    if (selectedDate && selectedTime && consultationType) {
      const [hours, minutes] = selectedTime.split(':');
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);
      
      setBookingData({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        consultation_type: consultationType
      });
      
      navigate('/booking/details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-indigo-500" />
          <p className="text-slate-600 text-sm sm:text-base">Loading availability...</p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <SOSButton />
      
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">
              Choose Your Appointment Time
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600">
              Select a date and time that works for you
            </p>
          </div>

          {/* Volunteer Card - Responsive */}
          {volunteer && (
            <Card className="mb-6 sm:mb-8 border-0 shadow-md sm:shadow-lg bg-gradient-to-r from-blue-100 to-indigo-100">
              <CardContent className="p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 shadow-md ring-4 ring-indigo-100 flex-shrink-0">
                    <AvatarImage src={volunteer.profile_image_url} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-blue-500 text-white text-sm sm:text-base md:text-lg font-bold">
                      {volunteer.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg md:text-xl text-slate-800">
                      {volunteer.full_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Your selected volunteer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content - Responsive Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Calendar Card */}
            <Card className="border-0 shadow-md sm:shadow-lg bg-white">
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                  <span>Select Date</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Choose a date within the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                {/* Month Navigation */}
                <div className="mb-4 flex justify-between items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                    className="border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                  >
                    Prev
                  </Button>
                  <span className="font-bold text-slate-800 text-sm sm:text-base md:text-lg">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                    className="border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                  >
                    Next
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-xs sm:text-sm font-bold text-slate-700 pb-1 sm:pb-2">
                      <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                      <span className="sm:hidden">{day}</span>
                    </div>
                  ))}
                  {days.map((day, index) => {
                    const available = isDateAvailable(day);
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => available && setSelectedDate(day)}
                        disabled={!available}
                        className={`
                          p-1.5 sm:p-2 md:p-2.5 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all font-medium
                          ${available ? 'hover:bg-indigo-100 hover:scale-105 sm:hover:scale-110 cursor-pointer text-slate-700' : 'text-slate-300 cursor-not-allowed'}
                          ${selected ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold shadow-md scale-105 sm:scale-110' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500 mt-3 sm:mt-4 text-center bg-slate-50 p-2 rounded-lg">
                  All times shown in UK timezone (GMT/BST)
                </p>
              </CardContent>
            </Card>

            {/* Right Column - Time Slots & Consultation Type */}
            <div className="space-y-4 sm:space-y-6">
              {/* Available Times Card */}
              <Card className="border-0 shadow-md sm:shadow-lg bg-white">
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl text-slate-800">
                    Available Times
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    {selectedDate 
                      ? `Times for ${format(selectedDate, 'EEEE, MMM d')}`
                      : 'Select a date to see available times'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                  {selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            disabled={!slot.available}
                            className={`font-semibold text-xs sm:text-sm p-2 sm:p-2.5 ${
                              selectedTime === slot.time
                                ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md'
                                : 'border-2 border-indigo-200 hover:bg-indigo-50 text-slate-700'
                            }`}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-6 sm:py-8 italic text-sm">
                        No available slots for this date
                      </p>
                    )
                  ) : (
                    <p className="text-slate-500 text-center py-6 sm:py-8 italic text-sm">
                      Please select a date first
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Consultation Type Card */}
              <Card className="border-0 shadow-md sm:shadow-lg bg-white">
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl text-slate-800">
                    Consultation Type
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600">
                    How would you like to have your session?
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-2 sm:space-y-3">
                  {/* Phone Option */}
                  <button
                    onClick={() => setConsultationType('phone')}
                    className={`
                      w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all duration-300
                      ${consultationType === 'phone' 
                        ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md ring-2 ring-indigo-300' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm sm:text-base text-slate-800">Phone Call</p>
                        <p className="text-xs sm:text-sm text-slate-600">
                          We'll call you at your number
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* In-Person Option */}
                  <button
                    onClick={() => setConsultationType('in_person')}
                    className={`
                      w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all duration-300
                      ${consultationType === 'in_person' 
                        ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md ring-2 ring-indigo-300' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm sm:text-base text-slate-800">In-Person</p>
                        <p className="text-xs sm:text-sm text-slate-600 break-words">{OFFICE_ADDRESS}</p>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Helper Text */}
          {(!selectedDate || !selectedTime || !consultationType) && (
            <p className="text-center text-slate-500 text-xs sm:text-sm mt-4 sm:mt-6 px-4">
              {!selectedDate && "Please select a date to continue"}
              {selectedDate && !selectedTime && "Please select a time slot"}
              {selectedDate && selectedTime && !consultationType && "Please choose a consultation type"}
            </p>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6 sm:mt-8 px-2 sm:px-0">
            <Button 
              variant="outline" 
              onClick={() => navigate('/booking/select-volunteer')}
              className="w-full sm:w-auto order-2 sm:order-1
                        border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400
                        text-slate-700 font-semibold 
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        shadow-sm hover:shadow-md"
            >
              Back
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!selectedDate || !selectedTime || !consultationType}
              className={`w-full sm:w-auto order-1 sm:order-2
                        font-bold 
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        rounded-md
                        ${
                          selectedDate && selectedTime && consultationType
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md hover:shadow-xl scale-100 hover:scale-105'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-sm'
                        }`}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
