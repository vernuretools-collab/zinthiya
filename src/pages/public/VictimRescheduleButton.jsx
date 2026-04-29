import React, { useState, useEffect } from 'react';
import { functions, db } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';


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
    raw: now,
  };
};


const VictimRescheduleButton = ({ bookingId, bookingRef, victimEmail, cancelToken, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [upcomingSlots, setUpcomingSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);


  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 9999;
    const [time, ampm] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };


  const getUkDayRangeUtc = (dateUtc) => {
    const ukStr = dateUtc.toLocaleString('en-CA', { timeZone: 'Europe/London', hour12: false });
    const [ymd] = ukStr.split(', ');
    const [year, month, day] = ymd.split('-').map(Number);

    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const ukTimeStr = utcMidnight.toLocaleString('en-CA', { timeZone: 'Europe/London', hour12: false });
    const ukParsed = new Date(ukTimeStr.replace(', ', 'T') + 'Z');
    const ukOffset = utcMidnight.getTime() - ukParsed.getTime();

    const startOfUkDayUtc = new Date(utcMidnight.getTime() - ukOffset);
    const endOfUkDayUtc = new Date(startOfUkDayUtc.getTime() + 24 * 60 * 60 * 1000);
    return { startOfUkDayUtc, endOfUkDayUtc };
  };


  // ✅ FIXED: Convert "yyyy-MM-dd" + "1:00 PM" → correct UTC ISO string
  // Uses + offsetMs (not - offsetMs) — IANA Europe/London handles BST/GMT forever
  const buildISOFromSlot = (dateStr, time) => {
    const [timePart, ampm] = time.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    // Step 1: Treat the UK wall-clock time as if it were UTC (naive instant)
    const naiveUTC = new Date(
      `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`
    );

    // Step 2: Ask the browser what UK time shows for that naive UTC instant
    const ukFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = ukFormatter.formatToParts(naiveUTC);
    const get = (type) => parts.find(p => p.type === type).value;

    // Step 3: The difference = the actual UK UTC offset for this date
    const ukAsUTC = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
    );
    const offsetMs = naiveUTC.getTime() - ukAsUTC.getTime();

    // Step 4: ✅ FIXED — add offsetMs (not subtract) to get correct UTC instant
    return new Date(naiveUTC.getTime() + offsetMs).toISOString();
  };


  useEffect(() => {
    const fetchUpcomingSlots = async () => {
      setSlotsLoading(true);
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        if (!bookingSnap.exists()) return;
        const volunteerId = bookingSnap.data().volunteer_id;
        if (!volunteerId) return;

        const ukNow = getUKNow();
        const results = [];

        for (let i = 1; i <= 30 && results.length < 2; i++) {
          const dayUtc = new Date(ukNow.raw.getTime() + i * 24 * 60 * 60 * 1000);
          const { startOfUkDayUtc, endOfUkDayUtc } = getUkDayRangeUtc(dayUtc);

          // Skip leave days
          const leaveSnap = await getDocs(query(
            collection(db, 'volunteer_date_availability'),
            where('volunteer_id', '==', volunteerId),
            where('date', '>=', startOfUkDayUtc),
            where('date', '<', endOfUkDayUtc),
            where('is_available', '==', false)
          ));
          if (!leaveSnap.empty) continue;

          // Get available slots
          const availSnap = await getDocs(query(
            collection(db, 'volunteer_date_availability'),
            where('volunteer_id', '==', volunteerId),
            where('date', '>=', startOfUkDayUtc),
            where('date', '<', endOfUkDayUtc),
            where('is_available', '==', true)
          ));
          if (availSnap.empty) continue;

          // Get booked slots that day (exclude current booking)
          const bookedSnap = await getDocs(query(
            collection(db, 'bookings'),
            where('volunteer_id', '==', volunteerId),
            where('status', 'in', ['upcoming', 'confirmed', 'active']),
            where('start_time', '>=', startOfUkDayUtc),
            where('start_time', '<', endOfUkDayUtc)
          ));

          const bookedTimes = bookedSnap.docs
            .filter(d => d.id !== bookingId)
            .map(d => {
              const st = d.data().start_time?.toDate?.() || new Date(d.data().start_time);
              const ukF = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/London',
                hour: '2-digit', minute: '2-digit', hour12: false,
              });
              const po = {};
              ukF.formatToParts(st).forEach(p => { po[p.type] = p.value; });
              let h = parseInt(po.hour);
              const mm = po.minute;
              const ap = h >= 12 ? 'PM' : 'AM';
              if (h === 0) h = 12; else if (h > 12) h -= 12;
              return `${h}:${mm} ${ap}`;
            });

          const freeTimes = availSnap.docs
            .map(d => d.data().time)
            .filter(t => t && !bookedTimes.includes(t))
            .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

          if (freeTimes.length === 0) continue;

          const ukDate = startOfUkDayUtc.toLocaleDateString('en-GB', {
            timeZone: 'Europe/London',
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          });
          const dateStr = startOfUkDayUtc.toLocaleDateString('en-CA', {
            timeZone: 'Europe/London',
          });

          results.push({ dateLabel: ukDate, dateStr, times: freeTimes });
        }

        setUpcomingSlots(results);
      } catch (err) {
        console.error('Failed to fetch upcoming slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchUpcomingSlots();
  }, [bookingId]);


  const isFormValid = selectedDateStr && selectedTime && reason.trim();


  const handleReschedule = async () => {
    if (!isFormValid) {
      alert('Please select a time slot and provide a reason');
      return;
    }

    const isoDate = buildISOFromSlot(selectedDateStr, selectedTime);

    // Past-time guard using UK time
    const ukNow = getUKNow();
    const slotMinutes = timeToMinutes(selectedTime);
    const isToday = selectedDateStr === ukNow.dateStr;
    const isPast = selectedDateStr < ukNow.dateStr;
    const isTooSoon = isToday && slotMinutes <= ukNow.minutesInDay + 30;

    if (isPast || isTooSoon) {
      alert('Please select a time at least 30 minutes from now (UK time)');
      return;
    }

    setLoading(true);

    try {
      const sendNotification = httpsCallable(functions, 'sendVictimRescheduleNotification');
      await sendNotification({ bookingId, newDate: isoDate, reason, victimEmail, cancelToken });

      alert('✅ Booking rescheduled successfully!');
      onSuccess();
    } catch (error) {
      console.error('Reschedule error:', error);
      alert(error.message || 'Failed to reschedule booking');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-3xl font-bold text-blue-600 mb-2 text-center">
        📅 Reschedule Appointment
      </h2>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Ref: <span className="font-semibold text-gray-700">{bookingRef}</span>
      </p>

      {/* Available Slots */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
          <span className="text-green-500">🟢</span> Select an Available Time Slot
        </h3>
        <p className="text-xs text-gray-400 mb-3">Tap a time to select it</p>

        {slotsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
            <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Checking adviser availability...
          </div>
        ) : upcomingSlots.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
            ⚠️ No available slots in the next 30 days. Please contact support.
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSlots.map(({ dateLabel, dateStr, times }) => (
              <div key={dateStr} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100">
                  <p className="text-sm font-bold text-blue-800">📆 {dateLabel}</p>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {times.map(time => {
                    const isSelected = selectedDateStr === dateStr && selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setSelectedDateStr(dateStr);
                          setSelectedTime(time);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        🕐 {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Summary */}
      {selectedDateStr && selectedTime && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-blue-800">Selected Slot</p>
            <p className="text-sm text-blue-700">
              {upcomingSlots.find(s => s.dateStr === selectedDateStr)?.dateLabel} at <strong>{selectedTime}</strong>{' '}
              <span className="text-blue-400 text-xs">(UK time)</span>
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 mb-6" />

      {/* Reason */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason for Rescheduling <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why do you need to reschedule? (Required)"
          rows={4}
          className="w-full p-4 border border-gray-300 rounded-xl resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleReschedule}
        disabled={loading || !isFormValid}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-0.5 transition-all"
      >
        {loading ? 'Rescheduling...' : '📅 Confirm Reschedule'}
      </button>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 mt-4">
        ⚠️ Your adviser will be notified of the new time automatically.
      </div>
    </div>
  );
};

export default VictimRescheduleButton;