// 🔥 COMPLETE CODE - FILTERS + RATING COLUMN
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Calendar, Users, Star, TrendingUp, Search, Filter,
  Phone, Clock, ChevronDown
} from 'lucide-react';
import { format, isToday, startOfWeek, startOfMonth, parseISO } from 'date-fns';

export default function Reports() {
  const [stats, setStats] = useState({
    totalBookings: 0, todayBookings: 0, thisWeekBookings: 0, thisMonthBookings: 0,
    totalVolunteers: 0, activeVolunteers: 0, avgRating: 0, totalRatings: 0
  });
  const [bookings, setBookings] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table filters
  const [tableFilters, setTableFilters] = useState({
    status: '',
    volunteer: '',
    victim: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getStatusBadge = (status) => {
    const colors = {
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50',
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-50',
      completed: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-50',
      cancelled: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-50'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-50';
  };

  // 🔥 STAR RATING COMPONENT
  const StarRating = ({ rating = 0, size = 16 }) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-${size} w-${size} transition-all ${
            i < Math.round(rating)
              ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = !tableFilters.status || booking.status === tableFilters.status;
    const matchesVolunteer = !tableFilters.volunteer ||
      String(booking.volunteer_name || '').toLowerCase().includes(tableFilters.volunteer.toLowerCase());
    const matchesVictim = !tableFilters.victim ||
      String(booking.victim_name || '').toLowerCase().includes(tableFilters.victim.toLowerCase());

    let matchesDate = true;
    if (tableFilters.dateFrom || tableFilters.dateTo) {
      const bookingDate = booking.start_time?.toDate();
      if (tableFilters.dateFrom && bookingDate < new Date(tableFilters.dateFrom)) matchesDate = false;
      if (tableFilters.dateTo && bookingDate > new Date(tableFilters.dateTo)) matchesDate = false;
    }

    return matchesStatus && matchesVolunteer && matchesVictim && matchesDate;
  });

  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch volunteers FIRST
      const volunteersSnap = await getDocs(collection(db, 'volunteers'));
      const volunteerMap = {};
      volunteersSnap.docs.forEach(doc => {
        volunteerMap[doc.id] = doc.data().full_name || doc.data().name || 'Unknown Volunteer';
      });

      // 🔥 FETCH RATINGS for booking lookup
      const ratingsSnap = await getDocs(collection(db, 'ratings'));
      const ratingMap = {};
      ratingsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.booking_id) {
          ratingMap[data.booking_id] = {
            rating: data.rating || 0,
            created_at: data.created_at
          };
        }
      });

      // Fetch bookings
      const bookingsSnap = await getDocs(query(
        collection(db, 'bookings'),
        orderBy('start_time', 'desc')
      ));

      const allBookings = bookingsSnap.docs.map(doc => {
        const data = doc.data();
        const volunteerId = data.volunteer_id;
        const bookingId = doc.id;

        const volunteer_name = volunteerId && volunteerMap[volunteerId]
          ? volunteerMap[volunteerId]
          : 'Unassigned';

        // 🔥 ADD RATING DATA
        const bookingRating = ratingMap[bookingId];

        return {
          id: doc.id,
          ...data,
          volunteer_name,
          rating: bookingRating?.rating || 0,
          hasRating: !!bookingRating
        };
      });

      // Stats
      const todayCount = allBookings.filter(b => isToday(b.start_time?.toDate())).length;
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekCount = allBookings.filter(b => b.start_time?.toDate() >= weekStart).length;
      const monthStart = startOfMonth(new Date());
      const monthCount = allBookings.filter(b => b.start_time?.toDate() >= monthStart).length;

      setBookings(allBookings);
      setStats(prev => ({
        ...prev,
        totalBookings: allBookings.length,
        todayBookings: todayCount,
        thisWeekBookings: weekCount,
        thisMonthBookings: monthCount
      }));

      // Volunteers
      const allVolunteers = volunteersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeCount = allVolunteers.filter(v => v.is_active !== false).length;
      const topVolunteers = allVolunteers
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 5);

      setVolunteers(topVolunteers);
      setStats(prev => ({
        ...prev,
        totalVolunteers: allVolunteers.length,
        activeVolunteers: activeCount
      }));

      // Ratings stats
      const ratings = ratingsSnap.docs.map(doc => doc.data());
      const avgRating = ratings.length ?
        (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
        : 0;

      setStats(prev => ({
        ...prev,
        totalRatings: ratings.length,
        avgRating: parseFloat(avgRating)
      }));

    } catch (error) {
      console.error('Reports error:', error);
      setError('Failed to load reports. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setTableFilters({ status: '', volunteer: '', victim: '', dateFrom: '', dateTo: '' });
    setCurrentPage(1);
  };

  const updateFilter = (key, value) => {
    setTableFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-lg text-gray-600">Loading analytics...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] p-8 text-center">
          <div className="max-w-md">
            <div className="text-6xl mb-4 text-red-400">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Load Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchReportsData} className="px-8 py-3 shadow-lg">
              🔄 Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Analytics Dashboard
            </h1>
          </div>
          <Button onClick={fetchReportsData} className="px-6 py-2 h-12 shadow-lg hover:shadow-xl">
            🔄 Refresh Data
          </Button>
        </div>

        {/* 🔥 COMPLETE FILTERS + RATING COLUMN */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Recent Bookings
              </CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1 h-9 px-4"
                  disabled={!Object.values(tableFilters).some(v => v)}
                >
                  Clear Filters
                </Button>
                <Badge variant="outline" className="text-sm">
                  {filteredBookings.length} of {stats.totalBookings} total
                </Badge>
              </div>
            </div>

            {/* 🔥 ALL ORIGINAL FILTERS RESTORED */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Victim name"
                  value={tableFilters.victim}
                  onChange={(e) => updateFilter('victim', e.target.value)}
                  className="h-10 pl-10"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Adviser name"
                  value={tableFilters.volunteer}
                  onChange={(e) => updateFilter('volunteer', e.target.value)}
                  className="h-10 pl-10"
                />
              </div>
              <Input
                type="date"
                value={tableFilters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="h-10"
                placeholder="From Date"
              />
              <Input
                type="date"
                value={tableFilters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="h-10"
                placeholder="To Date"
              />
              <select
                value={tableFilters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Victim</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Adviser</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                        {booking.booking_reference}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        {booking.victim_name}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        {booking.volunteer_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(booking.start_time?.toDate() || new Date(), 'MMM dd, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.consultation_type === 'phone' ? (
                          <Badge className="bg-blue-100 text-blue-800">📞 Phone</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">🏥 In-Person</Badge>
                        )}
                      </td>
                      {/* 🔥 NEW RATING COLUMN */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StarRating rating={booking.rating} size={4} />
                          <span className="text-sm font-medium text-gray-900">
                            {booking.rating > 0 ? booking.rating : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadge(booking.status)}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredBookings.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-6 px-6 py-4 bg-gray-50 rounded-b-xl">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredBookings.length)}</span> of{' '}
                  <span className="font-medium">{filteredBookings.length}</span> results
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredBookings.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredBookings.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {filteredBookings.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No bookings match your filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Volunteers - UNCHANGED */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Top 5 Adviser</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {volunteers.map((volunteer) => (
                <div key={volunteer.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border hover:border-gray-200">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {volunteer.full_name?.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{volunteer.full_name}</p>
                      <p className="text-sm text-gray-500">{volunteer.specialty || 'General Support'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 transition-all ${
                            i < Math.round((volunteer.average_rating || 0))
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      {volunteer.average_rating?.toFixed(1) || 0} ({volunteer.rating_count || 0})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
