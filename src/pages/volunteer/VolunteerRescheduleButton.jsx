import React, { useState } from 'react';
import { functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';


// ✅ Single source of truth for UK date/time
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


const VolunteerRescheduleButton = ({ bookingId, bookingRef, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState('AM');

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];


  const buildISODate = () => {
    if (!selectedDate || !selectedHour) return null;

    let hour24 = parseInt(selectedHour);
    if (selectedAmPm === 'PM' && hour24 !== 12) hour24 += 12;
    if (selectedAmPm === 'AM' && hour24 === 12) hour24 = 0;

    // Step 1: Treat the UK wall-clock time as if it were UTC (naive instant)
    const naiveUTC = new Date(
      `${selectedDate}T${String(hour24).padStart(2, '0')}:${selectedMinute}:00Z`
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

    // Step 4: ✅ FIXED — + offsetMs (not - offsetMs) to get correct UTC instant
    return new Date(naiveUTC.getTime() + offsetMs).toISOString();
  };


  const isFormValid = selectedDate && selectedHour && reason.trim();


  const handleReschedule = async () => {
    if (!isFormValid) {
      alert('Please select a date, time and provide a reason');
      return;
    }

    const isoDate = buildISODate();
    if (!isoDate) {
      alert('Invalid date/time selected');
      return;
    }

    // Past-time guard using UK time
    const ukNow = getUKNow();
    const selectedMinutesInDay = (() => {
      let h = parseInt(selectedHour);
      if (selectedAmPm === 'PM' && h !== 12) h += 12;
      if (selectedAmPm === 'AM' && h === 12) h = 0;
      return h * 60 + parseInt(selectedMinute);
    })();

    const isPast = selectedDate < ukNow.dateStr;
    const isToday = selectedDate === ukNow.dateStr;
    const isTooSoon = isToday && selectedMinutesInDay <= ukNow.minutesInDay + 30;

    if (isPast || isTooSoon) {
      alert('Please select a time at least 30 minutes from now (UK time)');
      return;
    }

    setLoading(true);
    try {
      console.log('📅 Selected:', selectedDate, selectedHour, selectedMinute, selectedAmPm);
      console.log('🌐 ISO UTC:', isoDate);

      const rescheduleFn = httpsCallable(functions, 'onVolunteerRescheduleBooking');
      await rescheduleFn({ bookingId, newDate: isoDate, reason });

      alert('✅ Booking rescheduled successfully!');
      onSuccess();
    } catch (error) {
      console.error('Reschedule error:', error);
      alert(error.message || 'Failed to reschedule booking');
    } finally {
      setLoading(false);
    }
  };


  // Today min date uses UK date — not UTC ISO split
  const today = getUKNow().dateStr;


  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-3xl font-bold text-yellow-600 mb-2 text-center">
        🔄 Reschedule Booking
      </h2>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Ref: <span className="font-semibold text-gray-700">{bookingRef}</span>
      </p>

      <div className="space-y-6">

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800"
            disabled={loading}
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Time <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-400 font-normal">(UK time)</span>
          </label>
          <div className="flex gap-3">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="flex-1 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 text-gray-800 bg-white"
              disabled={loading}
            >
              <option value="">Hour</option>
              {hours.map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(e.target.value)}
              className="flex-1 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 text-gray-800 bg-white"
              disabled={loading}
            >
              {minutes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={selectedAmPm}
              onChange={(e) => setSelectedAmPm(e.target.value)}
              className="flex-1 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 text-gray-800 bg-white"
              disabled={loading}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {selectedDate && selectedHour && (
            <p className="text-sm text-yellow-600 mt-2 font-medium">
              🕐 Selected: {selectedDate} at {selectedHour}:{selectedMinute} {selectedAmPm}{' '}
              <span className="text-gray-400">(UK time)</span>
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Rescheduling <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rescheduling? (Required)"
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-xl resize-vertical focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleReschedule}
          disabled={loading || !isFormValid}
          className="w-full bg-yellow-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-0.5 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Rescheduling...
            </span>
          ) : (
            '🔄 Confirm Reschedule'
          )}
        </button>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          ⚠️ The client will be notified of the new time automatically by email.
        </div>

      </div>
    </div>
  );
};

export default VolunteerRescheduleButton;