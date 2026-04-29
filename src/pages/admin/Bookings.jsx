import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar,
  Phone,
  MapPin
} from 'lucide-react';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [volunteers, setVolunteers] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    status: 'all',
    volunteer: 'all',
    consultationType: 'all',
    search: ''
  });

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'bookings'));
        const allBookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().start_time?.toDate ? doc.data().start_time.toDate() : new Date(doc.data().start_time)
        }));
        setBookings(allBookings);
        setFilteredBookings(allBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  useEffect(() => {
    async function fetchVolunteers() {
      try {
        const snapshot = await getDocs(collection(db, 'volunteers'));
        const volunteerMap = {};
        snapshot.docs.forEach(doc => {
          volunteerMap[doc.id] = doc.data().full_name || doc.id;
        });
        setVolunteers(volunteerMap);
      } catch (error) {
        console.error('Error fetching volunteers:', error);
      }
    }
    fetchVolunteers();
  }, []);

  useEffect(() => {
    let filtered = [...bookings];
    if (filters.status !== 'all') filtered = filtered.filter(b => b.status === filters.status);
    if (filters.volunteer !== 'all') filtered = filtered.filter(b => b.volunteer_id === filters.volunteer);
    if (filters.consultationType !== 'all') filtered = filtered.filter(b => b.consultation_type === filters.consultationType);
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(b => 
        b.victim_name?.toLowerCase().includes(searchLower) ||
        volunteers[b.volunteer_id]?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredBookings(filtered);
  }, [filters, bookings, volunteers]);

  const getDayBookings = (date) => {
    return filteredBookings.filter(booking => isSameDay(booking.startDate, date));
  };

  // 🔥 FIXED: Generate 6x7 calendar grid (42 cells total)
  const generateCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const firstDayOfWeek = monthStart.getDay(); // Sunday = 0
    
    const days = [];
    
    // Empty cells before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, isEmpty: true, isCurrentMonth: false });
    }
    
    // Current month days
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    monthDays.forEach(day => {
      days.push({ date: day, isEmpty: false, isCurrentMonth: true });
    });
    
    // Empty cells after month ends (fill to 42 cells)
    while (days.length < 42) {
      days.push({ date: null, isEmpty: true, isCurrentMonth: false });
    }
    
    return days;
  };

  const calendarGrid = generateCalendarGrid();
  const uniqueStatuses = Array.from(new Set(bookings.map(b => b.status)));

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              Bookings Calendar
            </h1>
            <p className="text-gray-600">{filteredBookings.length} bookings | {format(currentMonth, 'MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Client name, volunteer..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} 
                  className="w-full p-2.5 border border-gray-200 rounded-lg"
                >
                  <option value="all">All Status</option>
                  {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Volunteer</label>
                <select 
                  value={filters.volunteer} 
                  onChange={(e) => setFilters(prev => ({ ...prev, volunteer: e.target.value }))} 
                  className="w-full p-2.5 border border-gray-200 rounded-lg"
                >
                  <option value="all">All Volunteers</option>
                  {Object.entries(volunteers).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 FIXED: SINGLE 6x7 GRID CONTAINER */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            Loading calendar...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 🔥 HEADER - 7 COLUMNS */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-4 text-center font-bold text-sm uppercase text-gray-700 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* 🔥 6 ROWS x 7 COLUMNS = ONE BIG GRID */}
            <div className="grid grid-cols-7 grid-rows-6 gap-0">
              {calendarGrid.map((cell, index) => (
                <div 
                  key={index}
                  className={`
                    h-28 p-2 border border-gray-100 first:border-t-0 last:border-b-0
                    group hover:bg-gray-50/50 transition-all relative overflow-hidden
                    ${cell.isEmpty ? 'bg-gray-25 opacity-75 cursor-default' : ''}
                    ${isToday(cell.date) ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 shadow-lg z-10' : ''}
                    ${!cell.isEmpty && getDayBookings(cell.date).length > 0 ? 'bg-gradient-to-br from-emerald-50 to-blue-50 shadow-md border-l-4 border-emerald-400 hover:shadow-xl z-20' : ''}
                  `}
                >
                  {/* Day Number */}
                  {!cell.isEmpty && (
                    <div className={`font-bold text-lg mb-1.5 leading-tight ${
                      isToday(cell.date) ? 'text-blue-700 drop-shadow-sm' :
                      getDayBookings(cell.date).length > 0 ? 'text-emerald-800 font-extrabold' : 'text-gray-800'
                    }`}>
                      {format(cell.date, 'd')}
                    </div>
                  )}

                  {/* Booking Count Dots */}
                  {!cell.isEmpty && getDayBookings(cell.date).length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-2 -ml-0.5">
                      {getDayBookings(cell.date).slice(0, 4).map((booking, idx) => (
                        <div
                          key={booking.id}
                          className={`w-2 h-2 rounded-full shadow-sm ring-1 ring-white/50 ${getStatusColor(booking.status)}`}
                          title={`${booking.victim_name} - ${booking.status}`}
                        />
                      ))}
                      {getDayBookings(cell.date).length > 4 && (
                        <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full font-bold text-[10px]">
                          +{getDayBookings(cell.date).length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Booking List - Scrollable */}
                  <div className="space-y-1 max-h-16 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50">
                    {!cell.isEmpty && getDayBookings(cell.date).slice(0, 3).map(booking => (
                      <div key={booking.id} className="p-1.5 bg-white/90 backdrop-blur-sm rounded border border-gray-100/50 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all text-xs hover:border-blue-200">
                        <div className="font-semibold text-gray-900 truncate text-[11px]">
                          {booking.victim_name || 'Client'}
                        </div>
                        <div className="text-[10px] text-gray-600 truncate mt-0.5">
                          <span className="font-mono">{format(booking.startDate, 'HH:mm')}</span> • 
                          <span className="truncate ml-1 max-w-[70px]">{volunteers[booking.volunteer_id] || booking.volunteer_id}</span>
                        </div>
                        <div className={`mt-1 px-1.5 py-px rounded-full text-[9px] w-fit font-bold ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200/50' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200/50' :
                          'bg-blue-100 text-blue-800 border border-blue-200/50'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State */}
                  {cell.isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400 font-medium">—</span>
                    </div>
                  )}
                  
                  {/* {!cell.isEmpty && getDayBookings(cell.date).length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-emerald-50/90 to-green-50/90 rounded-lg">
                      <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-white/80 rounded-full shadow-sm">
                        Available
                      </span>
                    </div>
                  )} */}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="bg-gray-50 p-4 border-t">
              <div className="flex items-center justify-center gap-8 text-sm font-medium">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>Confirmed</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>Upcoming</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>Cancelled</div>
                <div className="ml-auto text-gray-700 font-semibold">{filteredBookings.length} total bookings</div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Table */}
        {/* <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Bookings ({filteredBookings.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-gray-800">Date</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-800">Client</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-800">Volunteer</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-800">Time</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.slice(0, 10).map(booking => (
                  <tr key={booking.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{format(booking.startDate, 'MMM d, yyyy')}</td>
                    <td className="p-4 font-medium">{booking.victim_name || 'Anonymous'}</td>
                    <td className="p-4">{volunteers[booking.volunteer_id] || booking.volunteer_id}</td>
                    <td className="p-4 font-mono">{format(booking.startDate, 'HH:mm')}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> */}
      </div>
    </AdminLayout>
  );
}
