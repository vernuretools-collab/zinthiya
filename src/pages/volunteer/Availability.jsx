import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Calendar as CalendarIcon, Clock, Plus, Loader2, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// ✅ Get today's date as a plain JS Date object at UK midnight (for DayPicker disabled prop)
const getUKTodayMidnight = () => {
  const ukDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // "2026-04-08"
  return new Date(ukDateStr + 'T00:00:00'); // local midnight — safe for DayPicker comparison
};

export default function VolunteerAvailability() {
  const navigate = useNavigate();
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const DEFAULT_TIME_SLOTS = [
    '9:30 AM', '10:45 AM', '12:00 PM', '1:45 PM',
  ];

  const [customHour, setCustomHour] = useState('');
  const [customMinute, setCustomMinute] = useState('00');
  const [customAmPm, setCustomAmPm] = useState('AM');

  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteOptions = ['00', '15', '30', '45'];

  const ukDateToUTC = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const ukFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = ukFormatter.formatToParts(utcMidnight);
    const get = (type) => parts.find(p => p.type === type).value;
    const ukAsUTC = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
    );
    const offsetMs = utcMidnight.getTime() - ukAsUTC.getTime();
    return new Date(utcMidnight.getTime() - offsetMs);
  };

  const toUKDateStr = (d) =>
    new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const cellToDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [availabilityForm, setAvailabilityForm] = useState({ dates: [], selectedTimes: [] });
  const [leaveForm, setLeaveForm] = useState({ dates: [], reason: '' });

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const collections = ['volunteer_date_availability', 'volunteer_availability'];
      let allAvailability = [];
      for (const collectionName of collections) {
        try {
          const q = query(collection(db, collectionName), where('volunteer_id', '==', userId));
          const querySnapshot = await getDocs(q);
          const availabilityList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName,
            ...doc.data(),
            date: doc.data().date?.toDate ? doc.data().date.toDate() : null,
          }));
          allAvailability = [...allAvailability, ...availabilityList];
        } catch (collectionError) {
          console.log(`No access to ${collectionName}`);
        }
      }
      setAvailability(allAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 9999;
    const [time, ampm] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getDayAvailability = (date) => {
    if (!date) return [];
    const targetDateStr = cellToDateStr(date);
    return availability
      .filter(slot => slot.date && toUKDateStr(slot.date) === targetDateStr)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  const generateCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const firstDayOfWeek = monthStart.getDay();
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push({ date: null, isEmpty: true });
    eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
      days.push({ date: day, isEmpty: false });
    });
    while (days.length < 42) days.push({ date: null, isEmpty: true });
    return days;
  };

  const calendarGrid = generateCalendarGrid();

  const removeAvailabilityDate = (dateStr) => {
    setAvailabilityForm(prev => ({ ...prev, dates: prev.dates.filter(d => d !== dateStr) }));
  };

  const handleAddCustomTime = () => {
    if (!customHour) { alert('Please select an hour'); return; }
    const formattedTime = `${parseInt(customHour)}:${customMinute} ${customAmPm}`;
    if (availabilityForm.selectedTimes.includes(formattedTime)) { alert('This time is already added'); return; }
    setAvailabilityForm(prev => ({ ...prev, selectedTimes: [...prev.selectedTimes, formattedTime] }));
    setCustomHour(''); setCustomMinute('00'); setCustomAmPm('AM');
  };

  const handleDeleteSlot = async (slotId, collectionName = 'volunteer_date_availability') => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, collectionName, slotId));
      await fetchAvailability();
      alert('✅ Entry deleted!');
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  if (loading) {
    return (
      <VolunteerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mr-2" />
          <span>Loading...</span>
        </div>
      </VolunteerLayout>
    );
  }

  const todayUK = cellToDateStr(new Date());

  // ✅ FIXED: DayPicker disabled boundary uses UK today — not browser-local startOfDay
  const ukTodayMidnight = getUKTodayMidnight();

  return (
    <VolunteerLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-[#155DFC]" />
              My Availability & Leave
            </h1>
            <p className="text-gray-600 mt-1">({availability.length} entries)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button onClick={() => setCurrentMonth(new Date())} size="sm" variant="outline">Today</Button>
            <Button onClick={() => setShowAvailabilityDialog(true)} className="bg-[#155DFC] text-white hover:bg-[#1248d4]">
              <Plus className="mr-2 h-4 w-4" /> Add Availability
            </Button>
            <Button onClick={() => setShowLeaveDialog(true)} variant="destructive" className="bg-red-500 text-white hover:bg-red-600">
              <Plus className="mr-2 h-4 w-4" /> Apply Leave
            </Button>
          </div>
        </div>

        {/* Monthly Calendar */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-50 border-b p-6 pb-4">
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>Click days to manage availability/leave</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 bg-gray-50/50 border-b divide-x divide-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center font-semibold text-xs uppercase text-gray-700 py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-100">
              {calendarGrid.map((cell, index) => {
                const daySlots = cell.isEmpty ? [] : getDayAvailability(cell.date);
                const isTodayCell = cell.date && cellToDateStr(cell.date) === todayUK;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`
                      h-28 p-2.5 relative group hover:shadow-md transition-all
                      ${cell.isEmpty ? 'bg-gray-50 cursor-default opacity-60' : 'hover:bg-emerald-50 cursor-pointer'}
                      ${isTodayCell ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/80 ring-2 ring-blue-300/50 shadow-lg border-2 border-blue-200' : ''}
                      ${daySlots.length > 0 ? 'shadow-md border-l-4 border-emerald-400 hover:shadow-xl hover:border-emerald-500' : ''}
                    `}
                    onClick={() => !cell.isEmpty && setSelectedDay(cell.date)}
                  >
                    {!cell.isEmpty && (
                      <div className={`font-bold text-base leading-tight mb-1.5 ${
                        isTodayCell ? 'text-blue-700 drop-shadow-sm' :
                        daySlots.length > 0 ? 'text-emerald-800 font-extrabold drop-shadow-sm' : 'text-gray-800'
                      }`}>
                        {format(cell.date, 'd')}
                      </div>
                    )}
                    {daySlots.length > 0 && (
                      <div className="absolute top-1 right-1 flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm ring-1 ring-white/50"></div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shadow-sm">
                          {daySlots.length}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1 max-h-16 overflow-y-auto pr-0.5 text-xs scrollbar-thin mt-1">
                      {daySlots.slice(0, 3).map(slot => {
                        const hasTime = slot.time || (slot.start_time && slot.end_time);
                        return (
                          <div key={slot.id} className={`p-1.5 rounded-lg shadow-sm border hover:shadow-md flex items-center gap-2 ${
                            slot.is_available ? 'bg-emerald-50/90 border-emerald-200' : 'bg-orange-50/90 border-orange-200'
                          }`}>
                            {hasTime ? (
                              <>
                                <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="font-medium text-emerald-900 truncate">
                                  {slot.time || `${slot.start_time}-${slot.end_time}`}
                                </span>
                              </>
                            ) : (
                              <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                            )}
                            <span className="text-xs truncate flex-1">{slot.reason}</span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Panel */}
        {selectedDay && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{format(selectedDay, 'EEEE, MMMM do yyyy')}</CardTitle>
                  <CardDescription>{getDayAvailability(selectedDay).length} entries</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {getDayAvailability(selectedDay).map(slot => (
                <div key={slot.id} className={`flex items-start justify-between p-4 rounded-lg hover:bg-gray-50 ${
                  slot.is_available ? 'bg-emerald-50 border-l-4 border-emerald-400' : 'bg-orange-50 border-l-4 border-orange-400'
                }`}>
                  <div className="flex-1">
                    <div className="font-semibold text-lg flex items-center gap-2 mb-1">
                      {slot.is_available ? '✅ Available' : '❌ Unavailable'}
                      {slot.is_full_day && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">Full Day</span>}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{slot.reason}</div>
                    {slot.time && (
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {slot.time}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive" size="sm"
                    className="mt-1 h-9 px-3 ml-2"
                    onClick={() => handleDeleteSlot(slot.id, slot.collection || 'volunteer_date_availability')}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Availability Dialog */}
        <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Set Availability</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Dates <span className="text-red-500">*</span></Label>
                <div className="mt-2 border rounded-lg p-0 bg-white">
                  <DayPicker
                    mode="multiple"
                    selected={availabilityForm.dates.map(d => new Date(d + 'T00:00:00'))}
                    onSelect={(dates) => {
                      if (dates) {
                        const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
                        setAvailabilityForm(prev => ({ ...prev, dates: dateStrings }));
                      }
                    }}
                    // ✅ FIXED: disabled uses UK today midnight — not browser-local startOfDay(new Date())
                    disabled={{ before: ukTodayMidnight }}
                    className="mx-auto flex justify-center"
                  />
                </div>
                {availabilityForm.dates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <p className="text-xs text-gray-600 w-full font-semibold">
                      Selected dates ({availabilityForm.dates.length}):
                    </p>
                    {availabilityForm.dates.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {format(new Date(d + 'T00:00:00'), 'MMM dd')}
                        <button type="button" className="text-blue-600 hover:text-blue-900 font-bold text-base"
                          onClick={() => removeAvailabilityDate(d)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Default Time Slots */}
              <div>
                <Label>Time Slots <span className="text-red-500">*</span></Label>
                <p className="text-xs text-gray-500 mb-2">Select available time slots</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_TIME_SLOTS.map(t => {
                    const selected = availabilityForm.selectedTimes.includes(t);
                    return (
                      <button
                        key={t} type="button"
                        onClick={() => setAvailabilityForm(prev => ({
                          ...prev,
                          selectedTimes: selected
                            ? prev.selectedTimes.filter(x => x !== t)
                            : [...prev.selectedTimes, t],
                        }))}
                        className={`text-sm px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Time */}
              <div>
                <Label>Add Custom Time</Label>
                <p className="text-xs text-gray-500 mb-2">Add additional time slots if needed</p>
                <div className="flex gap-2 items-center">
                  <select value={customHour} onChange={(e) => setCustomHour(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-emerald-400 text-sm">
                    <option value="">Hour</option>
                    {hours12.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select value={customMinute} onChange={(e) => setCustomMinute(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-emerald-400 text-sm">
                    {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={customAmPm} onChange={(e) => setCustomAmPm(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-emerald-400 text-sm">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCustomTime} className="shrink-0">Add</Button>
                </div>
                {customHour && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    🕐 Preview: {parseInt(customHour)}:{customMinute} {customAmPm}
                  </p>
                )}
                {availabilityForm.selectedTimes.filter(t => !DEFAULT_TIME_SLOTS.includes(t)).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <p className="text-xs text-gray-600 w-full">Custom times:</p>
                    {availabilityForm.selectedTimes.filter(t => !DEFAULT_TIME_SLOTS.includes(t)).map(t => (
                      <span key={t} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {t}
                        <button type="button" className="text-purple-600 hover:text-purple-900 font-bold text-base"
                          onClick={() => setAvailabilityForm(prev => ({
                            ...prev,
                            selectedTimes: prev.selectedTimes.filter(x => x !== t),
                          }))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    if (availabilityForm.dates.length === 0) { alert('Please select at least one date'); return; }
                    if (availabilityForm.selectedTimes.length === 0) { alert('Please select at least one time slot'); return; }
                    try {
                      const userId = auth.currentUser.uid;
                      const batchPromises = [];
                      for (const dateStr of availabilityForm.dates) {
                        const slotDate = ukDateToUTC(dateStr);
                        const slotDayEnd = new Date(slotDate.getTime() + 24 * 60 * 60 * 1000);
                        const qLeave = query(
                          collection(db, 'volunteer_date_availability'),
                          where('volunteer_id', '==', userId),
                          where('date', '>=', slotDate),
                          where('date', '<', slotDayEnd),
                          where('is_available', '==', false)
                        );
                        const leaveSnap = await getDocs(qLeave);
                        leaveSnap.forEach(leaveDoc => {
                          batchPromises.push(deleteDoc(doc(db, 'volunteer_date_availability', leaveDoc.id)));
                        });
                        for (const time of availabilityForm.selectedTimes) {
                          batchPromises.push(
                            addDoc(collection(db, 'volunteer_date_availability'), {
                              volunteer_id: userId,
                              date: slotDate,
                              time,
                              is_available: true,
                              is_full_day: false,
                              reason: 'Available',
                              created_at: serverTimestamp(),
                            })
                          );
                        }
                      }
                      await Promise.all(batchPromises);
                      setShowAvailabilityDialog(false);
                      setAvailabilityForm({ dates: [], selectedTimes: [] });
                      setCustomHour(''); setCustomMinute('00'); setCustomAmPm('AM');
                      await fetchAvailability();
                      alert('✅ Availability saved!');
                    } catch (error) {
                      console.error(error);
                      alert('Failed to add availability: ' + error.message);
                    }
                  }}
                >
                  Save Availability
                </Button>
                <Button variant="outline" className="flex-1"
                  onClick={() => {
                    setShowAvailabilityDialog(false);
                    setAvailabilityForm({ dates: [], selectedTimes: [] });
                    setCustomHour(''); setCustomMinute('00'); setCustomAmPm('AM');
                  }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Leave Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Dates <span className="text-red-500">*</span></Label>
                <p className="text-xs text-gray-500 mb-2">Click multiple dates to select leave days</p>
                <div className="border rounded-lg p-3 bg-white">
                  <DayPicker
                    mode="multiple"
                    selected={leaveForm.dates.map(d => new Date(d + 'T00:00:00'))}
                    onSelect={(dates) => {
                      if (dates) {
                        const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd')).sort();
                        setLeaveForm(prev => ({ ...prev, dates: dateStrings }));
                      } else {
                        setLeaveForm(prev => ({ ...prev, dates: [] }));
                      }
                    }}
                    // ✅ FIXED: disabled uses UK today midnight — not browser-local startOfDay(new Date())
                    disabled={{ before: ukTodayMidnight }}
                    className="mx-auto flex justify-center"
                  />
                </div>
                {leaveForm.dates.length > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs font-semibold text-orange-900 mb-2">
                      Selected: {leaveForm.dates.length} leave date(s)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {leaveForm.dates.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          {format(new Date(d + 'T00:00:00'), 'MMM dd')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Reason <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Personal leave, sick, vacation"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Note:</strong> Applying leave will remove any existing availability on selected dates and cancel upcoming appointments.</span>
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    if (leaveForm.dates.length === 0) { alert('Please select at least one date'); return; }
                    if (!leaveForm.reason.trim()) { alert('Please enter a reason for leave'); return; }
                    if (!confirm(`Apply leave for ${leaveForm.dates.length} date(s)?`)) return;
                    try {
                      const userId = auth.currentUser.uid;
                      const leavePromises = [];
                      for (const dateStr of leaveForm.dates) {
                        const leaveDate = ukDateToUTC(dateStr);
                        const leaveDayEnd = new Date(leaveDate.getTime() + 24 * 60 * 60 * 1000);
                        leavePromises.push(
                          addDoc(collection(db, 'volunteer_date_availability'), {
                            volunteer_id: userId,
                            date: leaveDate,
                            is_available: false,
                            is_full_day: true,
                            reason: leaveForm.reason,
                            leave_type: 'advisor_leave',
                            created_at: serverTimestamp(),
                          })
                        );
                        const qAvail = query(
                          collection(db, 'volunteer_date_availability'),
                          where('volunteer_id', '==', userId),
                          where('date', '>=', leaveDate),
                          where('date', '<', leaveDayEnd),
                          where('is_available', '==', true)
                        );
                        const availSnap = await getDocs(qAvail);
                        availSnap.forEach(d => {
                          leavePromises.push(deleteDoc(doc(db, 'volunteer_date_availability', d.id)));
                        });
                        const qBookings = query(
                          collection(db, 'bookings'),
                          where('volunteer_id', '==', userId),
                          where('start_time', '>=', leaveDate),
                          where('start_time', '<', leaveDayEnd),
                          where('status', '==', 'upcoming')
                        );
                        const bookingsSnap = await getDocs(qBookings);
                        bookingsSnap.forEach(bookingDoc => {
                          leavePromises.push(
                            updateDoc(doc(db, 'bookings', bookingDoc.id), {
                              status: 'cancelled',
                              cancelled_by: 'advisor',
                              cancelled_reason: `Advisor on leave: ${leaveForm.reason}`,
                              cancelled_at: serverTimestamp(),
                            })
                          );
                        });
                      }
                      await Promise.all(leavePromises);
                      setShowLeaveDialog(false);
                      setLeaveForm({ dates: [], reason: '' });
                      await fetchAvailability();
                      alert('✅ Leave applied! Any existing appointments have been cancelled.');
                    } catch (error) {
                      console.error(error);
                      alert('Failed to apply leave: ' + error.message);
                    }
                  }}
                >
                  Apply Leave
                </Button>
                <Button variant="outline" className="flex-1"
                  onClick={() => { setShowLeaveDialog(false); setLeaveForm({ dates: [], reason: '' }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </VolunteerLayout>
  );
}