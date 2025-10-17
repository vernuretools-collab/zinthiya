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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const days = getDaysInMonth();

  return (
    <div className="min-h-screen bg-gray-50">
      <SOSButton />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Choose Your Appointment Time
            </h1>
            <p className="text-gray-600">
              Select a date and time that works for you
            </p>
          </div>

          {volunteer && (
            <Card className="mb-8">
              <CardContent className="py-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={volunteer.profile_image_url} />
                    <AvatarFallback>
                      {volunteer.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{volunteer.full_name}</h3>
                    <p className="text-sm text-gray-600">Your selected volunteer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>
                  Choose a date within the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                  >
                    Previous
                  </Button>
                  <span className="font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                  >
                    Next
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600">
                      {day}
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
                          p-2 text-sm rounded-md transition-all
                          ${available ? 'hover:bg-blue-100 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}
                          ${selected ? 'bg-blue-600 text-white font-bold' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  All times shown in UK timezone (GMT/BST)
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Times</CardTitle>
                  <CardDescription>
                    {selectedDate 
                      ? `Times for ${format(selectedDate, 'EEEE, MMMM d')}`
                      : 'Select a date to see available times'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            disabled={!slot.available}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No available slots for this date
                      </p>
                    )
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      Please select a date first
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consultation Type</CardTitle>
                  <CardDescription>
                    How would you like to have your session?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => setConsultationType('phone')}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${consultationType === 'phone' 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">Phone Call</p>
                        <p className="text-sm text-gray-600">
                          We'll call you at your number
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setConsultationType('in_person')}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${consultationType === 'in_person' 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">In-Person</p>
                        <p className="text-sm text-gray-600">{OFFICE_ADDRESS}</p>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => navigate('/booking/select-volunteer')}>
              Back
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!selectedDate || !selectedTime || !consultationType}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
