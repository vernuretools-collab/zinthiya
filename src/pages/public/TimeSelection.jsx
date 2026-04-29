import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useBookingStore } from '../../stores/bookingStore';
import { OFFICE_ADDRESS } from '../../lib/utils';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { Calendar, Phone, MapPin, Loader2, Clock } from 'lucide-react';


// ✅ Single source of truth — always UK time, DST-safe forever
const getUKNow = () => {
  const now = new Date();
  const ukDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const ukTimeStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [ukHour, ukMin] = ukTimeStr.split(':').map(Number);
  return {
    dateStr: ukDateStr,
    minutesInDay: ukHour * 60 + ukMin,
  };
};


// ✅ Convert a JS Date to "YYYY-MM-DD" without any timezone shift
const toDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;


// ✅ Shared helper — converts a UK wall-clock time string + date → correct UTC Date
// Uses Intl.DateTimeFormat with Europe/London to detect the exact DST offset for that date.
// Works automatically forever — IANA tz database handles all future BST/GMT transitions.
const ukWallClockToUTC = (timeStr, date) => {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');

  // Step 1: Treat the UK wall-clock time as if it were UTC (naive instant)
  const naiveUTC = new Date(`${year}-${month}-${day}T${hh}:${mm}:00Z`);

  // Step 2: Ask the browser what UK time shows for that naive UTC instant
  const ukFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit', minute: '2-digit', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const ukParts = ukFormatter.formatToParts(naiveUTC);
  const ukObj = {};
  ukParts.forEach(p => { ukObj[p.type] = p.value; });

  // Step 3: The difference between naiveUTC and what UK shows = the UTC offset for this date
  const ukAsUTC = new Date(
    `${ukObj.year}-${ukObj.month}-${ukObj.day}T${ukObj.hour}:${ukObj.minute}:00Z`
  );
  const offsetMs = naiveUTC.getTime() - ukAsUTC.getTime();

  // Step 4: ✅ FIXED — add offsetMs (not subtract) to get the correct UTC instant
  return new Date(naiveUTC.getTime() + offsetMs);
};


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
    if (bookingData?.volunteer_id) {
      fetchVolunteerData();
    } else {
      navigate('/booking/select-volunteer');
    }
  }, []);


  useEffect(() => {
    if (selectedDate && bookingData?.volunteer_id) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);


  const getFirstName = (fullName) => fullName.split(' ')[0];


  const fetchVolunteerData = async () => {
    try {
      if (!bookingData?.volunteer_id) {
        navigate('/booking/select-volunteer');
        return;
      }
      const volunteerQuery = query(
        collection(db, 'volunteers'),
        where('__name__', '==', bookingData.volunteer_id)
      );
      const volunteerDoc = await getDocs(volunteerQuery);
      if (!volunteerDoc.empty) {
        setVolunteer({ id: volunteerDoc.docs[0].id, ...volunteerDoc.docs[0].data() });
      }
    } catch (error) {
      console.error('❌ Volunteer error:', error);
    } finally {
      setLoading(false);
    }
  };


  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };


  const filterPastTimes = (slots, date) => {
    const ukNow = getUKNow();
    const selectedDateStr = toDateStr(date);
    if (ukNow.dateStr !== selectedDateStr) return slots;
    return slots.filter(slot => timeToMinutes(slot.time) > ukNow.minutesInDay + 30);
  };


  const getUKMidnightUTC = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const ukTimeStr = utcMidnight.toLocaleString('en-CA', {
      timeZone: 'Europe/London',
      hour12: false,
    });
    const ukParsed = new Date(ukTimeStr.replace(', ', 'T') + 'Z');
    const ukOffset = utcMidnight.getTime() - ukParsed.getTime();
    return new Date(utcMidnight.getTime() - ukOffset);
  };


  // ✅ FIXED — now uses shared ukWallClockToUTC helper (correct + offset direction)
  const slotToUTCMinutes = (slotTime, slotDate) => {
    const utcDate = ukWallClockToUTC(slotTime, slotDate);
    return Math.floor(utcDate.getTime() / 60000);
  };


  const fetchAvailableSlots = async (date) => {
    if (!bookingData?.volunteer_id) return;
    setLoading(true);
    try {
      const dayStart = getUKMidnightUTC(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dateAvailabilityQuery = query(
        collection(db, 'volunteer_date_availability'),
        where('volunteer_id', '==', bookingData.volunteer_id),
        where('date', '>=', dayStart),
        where('date', '<', dayEnd),
        where('is_available', '==', true)
      );
      const dateAvailabilitySnapshot = await getDocs(dateAvailabilityQuery);

      const allSlots = [];
      dateAvailabilitySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.time) allSlots.push(data.time);
      });

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('volunteer_id', '==', bookingData.volunteer_id),
        where('start_time', '>=', dayStart),
        where('start_time', '<', dayEnd),
        where('status', 'in', ['active', 'upcoming', 'confirmed'])
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookedStartTimes = new Set();
      bookingsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.start_time) {
          bookedStartTimes.add(Math.floor(data.start_time.toDate().getTime() / 60000));
        }
      });

      const uniqueSlots = [...new Set(allSlots)];
      const finalSlots = filterPastTimes(
        uniqueSlots
          .filter(slotTime => !bookedStartTimes.has(slotToUTCMinutes(slotTime, date)))
          .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
          .map(slot => ({ time: slot, available: true })),
        date
      );

      setAvailableSlots(finalSlots);
    } catch (error) {
      console.error('❌ ERROR:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };


  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const leadingBlanks = Array(start.getDay()).fill(null);
    return [...leadingBlanks, ...days];
  };


  const isDateAvailable = (date) => {
    const ukNow = getUKNow();
    return toDateStr(date) >= ukNow.dateStr;
  };


  const handleNext = async () => {
    if (selectedDate && selectedTime && consultationType && bookingData?.volunteer_id) {
      try {
        setLoading(true);

        // ✅ FIXED — uses shared ukWallClockToUTC helper (correct + offset direction)
        const startTimeFinal = ukWallClockToUTC(selectedTime, selectedDate);
        const endTimeFinal = new Date(startTimeFinal.getTime() + 60 * 60 * 1000);

        // Past-time guard using UK time — not browser-local now
        const ukNow = getUKNow();
        const selectedDateStr = toDateStr(selectedDate);

        const [time, period] = selectedTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const bookingMinutes = hours * 60 + minutes;

        if (
          selectedDateStr < ukNow.dateStr ||
          (selectedDateStr === ukNow.dateStr && bookingMinutes <= ukNow.minutesInDay)
        ) {
          alert('Cannot book past appointments!');
          setLoading(false);
          return;
        }

        setBookingData({
          volunteer_id: bookingData.volunteer_id,
          start_time: startTimeFinal,
          end_time: endTimeFinal,
          consultation_type: consultationType,
          status: 'upcoming',
        });

        navigate('/booking/details');
      } catch (error) {
        console.error('Booking error:', error);
      } finally {
        setLoading(false);
      }
    }
  };


  if (loading && !volunteer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-indigo-500" />
          <p>Loading volunteer...</p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const contactPreference = volunteer?.contact_preference || 'both';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">
              Choose Your Appointment Time
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600">
              Select a date and time that works for you
            </p>
          </div>

          {volunteer ? (
            <>
              {/* Volunteer Card */}
              <Card className="mb-6 sm:mb-8 border-0 shadow-md sm:shadow-lg bg-gradient-to-r from-blue-100 to-indigo-100">
                <CardContent className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 shadow-md ring-4 ring-indigo-100 flex-shrink-0">
                      <AvatarImage src={volunteer.profile_image_url} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-blue-500 text-white text-sm sm:text-base md:text-lg font-bold">
                        {volunteer.full_name?.split(' ').map(n => n[0]).join('') || 'VN'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg md:text-xl text-slate-800">
                        {getFirstName(volunteer.full_name)}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">Your selected Adviser</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar + Time Slots */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">

                {/* Calendar Card */}
                <Card className="border-0 shadow-md sm:shadow-lg bg-white">
                  <CardHeader className="p-4 sm:p-5 md:p-6">
                    <CardTitle className="text-base sm:text-lg md:text-xl text-slate-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                      Select Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                    <div className="mb-4 flex justify-between items-center gap-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      >
                        Prev
                      </Button>
                      <span className="font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</span>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      >
                        Next
                      </Button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                        <div key={idx} className="text-center text-xs sm:text-sm font-bold text-slate-700 pb-1 sm:pb-2">
                          <span className="hidden sm:inline">{d}</span>
                          <span className="sm:hidden">{d[0]}</span>
                        </div>
                      ))}

                      {days.map((day, index) => {
                        if (!day) return <div key={`blank-${index}`} />;
                        const available = isDateAvailable(day);
                        const selected = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <button
                            key={index}
                            onClick={() => available && setSelectedDate(day)}
                            disabled={!available}
                            className={`
                              p-1.5 sm:p-2 text-xs sm:text-sm rounded-md transition-all font-medium
                              ${available
                                ? 'hover:bg-indigo-100 cursor-pointer text-slate-700'
                                : 'text-slate-300 cursor-not-allowed bg-gray-100'}
                              ${selected ? 'bg-indigo-500 text-white font-bold shadow-md' : ''}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Time Slots + Consultation Type */}
                <div className="space-y-6">
                  <Card className="border-0 shadow-md sm:shadow-lg bg-white">
                    <CardHeader className="p-4 sm:p-5">
                      <CardTitle className="text-base sm:text-lg text-slate-800 flex items-center gap-2">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        Available Times
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-slate-600">
                        {selectedDate
                          ? `${format(selectedDate, 'EEEE, MMM d')} (${availableSlots.length} slots)`
                          : 'Select date first'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 pt-0">
                      {selectedDate ? (
                        availableSlots.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableSlots.map((slot, index) => (
                              <Button
                                key={index}
                                variant={selectedTime === slot.time ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedTime(slot.time)}
                                className={`font-semibold text-xs sm:text-sm p-2 ${
                                  selectedTime === slot.time
                                    ? 'bg-indigo-500 text-white shadow-md'
                                    : 'border-indigo-200 hover:bg-indigo-50'
                                }`}
                              >
                                {slot.time}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-slate-500 text-sm sm:text-base font-medium">
                              No available slots for this date
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Try another date</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-slate-500 text-sm sm:text-base font-medium">
                            Please select a date first
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md sm:shadow-lg bg-white">
                    <CardHeader className="p-4 sm:p-5">
                      <CardTitle className="text-base sm:text-lg text-slate-800">
                        Consultation Type
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm text-slate-600">
                        Choose your session type
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                      {['phone', 'both'].includes(contactPreference) && (
                        <button
                          onClick={() => setConsultationType('phone')}
                          className={`
                            w-full p-3 rounded-lg border-2 text-left transition-all
                            ${consultationType === 'phone'
                              ? 'border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-300'
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-slate-800">Phone Call</p>
                              <p className="text-xs text-slate-600">We'll call you</p>
                            </div>
                          </div>
                        </button>
                      )}

                      {['personal', 'both'].includes(contactPreference) && (
                        <button
                          onClick={() => setConsultationType('in_person')}
                          className={`
                            w-full p-3 rounded-lg border-2 text-left transition-all
                            ${consultationType === 'in_person'
                              ? 'border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-300'
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-slate-800">In-Person</p>
                              <p className="text-xs text-slate-600 break-words">{OFFICE_ADDRESS}</p>
                            </div>
                          </div>
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {(!selectedDate || !selectedTime || !consultationType) && (
                <p className="text-center text-slate-500 text-sm mt-6 px-4">
                  {!selectedDate && 'Select a date'}
                  {selectedDate && !selectedTime && 'Select a time'}
                  {selectedDate && selectedTime && !consultationType && 'Choose consultation type'}
                </p>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8 px-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/booking/select-volunteer')}
                  className="w-full sm:w-auto border-2 border-slate-300 px-8 py-6 text-lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!selectedDate || !selectedTime || !consultationType || loading}
                  className={`w-full sm:w-auto px-8 py-6 text-lg font-bold rounded-md ${
                    selectedDate && selectedTime && consultationType && !loading
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold mb-4">Please select a volunteer first</p>
              <Button onClick={() => navigate('/booking/select-volunteer')}>
                Select Volunteer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}