import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import CalendarView from '../../components/volunteer/CalendarView';
import {
  Calendar,
  Phone,
  MapPin,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  List,
  Calendar as CalendarIcon,
  RefreshCw
} from 'lucide-react';
import { SUPPORT_CATEGORIES } from '../../lib/utils';

export default function VolunteerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const fetchBookings = useCallback(async () => {
    try {
      setRefreshing(true);
      const userId = auth.currentUser.uid;
      const q = query(
        collection(db, 'bookings'),
        where('volunteer_id', '==', userId),
        orderBy('start_time', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsList);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filterBookings = useCallback(() => {
    let filtered = [...bookings];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.victim_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  // ✅ FIXED: explicitly call .toDate() on Firestore Timestamp before comparing
  // Avoids silent failure if start_time is a raw Firestore Timestamp object
  const hasMeetingStarted = useCallback((booking) => {
    if (!booking?.start_time) return false;
    const startDate = booking.start_time?.toDate
      ? booking.start_time.toDate()
      : new Date(booking.start_time);
    return new Date() >= startDate;
  }, []);

  const updateBookingStatus = useCallback(async (bookingId, newStatus) => {
    try {
      setActionLoading(newStatus);
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updated_at: new Date()
      });
      await fetchBookings();
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('❌ Failed to update status');
    } finally {
      setActionLoading('');
    }
  }, [fetchBookings]);

  const handleCancel = useCallback(async (booking) => {
    if (!window.confirm(`Cancel booking ${booking.booking_reference}? The client will be notified by email.`)) return;
    try {
      setActionLoading('cancel');
      const cancelFn = httpsCallable(functions, 'sendVolunteerCancelNotification');
      await cancelFn({ bookingId: booking.id, reason: 'Cancelled by adviser' });
      await fetchBookings();
      setSelectedBooking(null);
      alert('✅ Booking cancelled! Client has been notified by email.');
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('❌ Cancel failed: ' + error.message);
    } finally {
      setActionLoading('');
    }
  }, [fetchBookings]);

  const formatUKDate = useCallback((timestamp, options) => {
    return timestamp.toDate().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      ...options
    });
  }, []);

  const formatUKTime = useCallback((timestamp) => {
    return timestamp.toDate().toLocaleTimeString('en-US', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const getStatusBadge = useCallback((status) => {
    const variants = {
      upcoming: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      no_show: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return (
      <Badge className={`px-3 py-1 ${variants[status] || variants.upcoming}`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  }, []);

  const getStatusCount = useCallback((status) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(b => b.status === status).length;
  }, [bookings]);

  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = async (e) => {
      if (!isPulling || window.scrollY !== 0) return;
      const currentY = e.touches[0].clientY;
      if (currentY - startY > 100) {
        isPulling = false;
        await fetchBookings();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [fetchBookings]);

  if (loading) {
    return (
      <VolunteerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </VolunteerLayout>
    );
  }

  return (
    <VolunteerLayout>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your appointments ({bookings.length} total)
          </p>
        </div>

        {/* Status Filter Tabs */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto scrollbar-hide pb-2">
              {[
                { key: 'all', label: 'All Bookings' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'no_show', label: 'No Show' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-1 min-w-[100px] sm:min-w-[110px] px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors relative cursor-pointer ${
                    statusFilter === tab.key
                      ? 'text-gray-900 bg-gray-50 border-b-3 border-blue-500 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-center font-semibold">{tab.label}</span>
                    <span className="text-xs font-normal text-gray-500">
                      ({getStatusCount(tab.key)})
                    </span>
                  </div>
                  {statusFilter === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}
                  className="h-10 sm:h-11 text-sm sm:text-base">
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refresh & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={fetchBookings}
            disabled={refreshing}
            className="flex-1 sm:flex-none sm:w-auto border-2 border-blue-200 hover:bg-blue-50 text-blue-700"
          >
            {refreshing ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Refreshing...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Refresh Bookings</>
            )}
          </Button>
          <div className="flex justify-end flex-1">
            <div className="inline-flex rounded-lg border-2 border-gray-200 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
                  viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
                  viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar or List */}
        {viewMode === 'calendar' ? (
          <CalendarView bookings={filteredBookings} onBookingClick={setSelectedBooking} />
        ) : (
          <Card className="border-0 shadow-md">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl">
                {filteredBookings.length} Booking{filteredBookings.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'No bookings match your current filters'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className={`cursor-pointer hover:shadow-xl transition-all duration-200 border-0 hover:border-gray-200 border-l-4 ${
                        booking.status === 'no_show'   ? 'border-l-gray-400 bg-gray-50/50' :
                        booking.status === 'upcoming'  ? 'border-l-blue-500 bg-blue-50/50' :
                        booking.status === 'completed' ? 'border-l-green-500 bg-green-50/50' :
                        'border-l-red-500 bg-red-50/50'
                      }`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <CardContent className="p-4 sm:p-5 md:p-6">
                        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {getStatusBadge(booking.status)}
                              {booking.rescheduled_by && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                  🔄 Rescheduled
                                </span>
                              )}
                              <Badge className={`${SUPPORT_CATEGORIES[booking.support_category]?.color || 'bg-purple-100 text-purple-800'} text-xs px-2.5 py-1`}>
                                {(() => {
                                  const Icon = SUPPORT_CATEGORIES[booking.support_category]?.icon;
                                  return Icon ? <Icon className="inline w-3 h-3 mr-1" /> : null;
                                })()}
                                {SUPPORT_CATEGORIES[booking.support_category]?.label || booking.support_category}
                              </Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                              <p className="font-bold text-lg sm:text-xl md:text-2xl text-gray-900 break-all leading-tight">
                                {booking.booking_reference}
                              </p>
                              <p className="font-semibold text-base text-gray-800">
                                Client: {booking.victim_name}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm sm:text-base text-gray-600 mb-4">
                              <div className="flex items-center gap-2 p-2 sm:p-3 bg-white/50 rounded-lg">
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                                <span>{formatUKDate(booking.start_time, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 sm:p-3 bg-white/50 rounded-lg">
                                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                                <span>{formatUKTime(booking.start_time)} – {formatUKTime(booking.end_time)}</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 sm:p-3 bg-white/50 rounded-lg">
                                {booking.consultation_type === 'phone' ? (
                                  <><Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" /><span>Phone Call</span></>
                                ) : (
                                  <><MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" /><span>In-Person</span></>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-4">
                            <Button
                              size="sm"
                              className="flex-1 sm:w-auto text-xs sm:text-sm h-10 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg whitespace-nowrap"
                              onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                            >
                              View Details
                            </Button>
                            {booking.status === 'upcoming' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 sm:w-auto text-xs sm:text-sm h-10 px-4 border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                                onClick={(e) => { e.stopPropagation(); navigate(`/volunteer/bookings/${booking.id}/reschedule`); }}
                              >
                                🔄 Reschedule
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking Details Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl md:text-3xl pr-8 font-bold">
                Booking Details
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base font-mono bg-gray-50 p-3 rounded-lg">
                Reference: <strong>{selectedBooking?.booking_reference}</strong>
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">

                {/* Status & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(selectedBooking.status)}
                      {selectedBooking.rescheduled_by && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          🔄 Rescheduled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Support Type</span>
                    <Badge className={`${SUPPORT_CATEGORIES[selectedBooking.support_category]?.color || 'bg-purple-100 text-purple-800'} px-3 py-2`}>
                      {SUPPORT_CATEGORIES[selectedBooking.support_category]?.label || selectedBooking.support_category}
                    </Badge>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Date & Time
                  </h3>
                  <div className="space-y-1 text-lg sm:text-xl font-semibold text-gray-900">
                    <p>{formatUKDate(selectedBooking.start_time, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-2xl text-blue-600">
                      {formatUKTime(selectedBooking.start_time)} – {formatUKTime(selectedBooking.end_time)}
                    </p>
                  </div>
                </div>

                {/* Consultation Type */}
                <div className="p-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Consultation Type</h3>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
                    {selectedBooking.consultation_type === 'phone' ? (
                      <>
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                          <Phone className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-gray-900">Phone Call</p>
                          <p className="text-sm text-gray-600">Call client at scheduled time</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-gray-900">In-Person Meeting</p>
                          <p className="text-sm text-gray-600">Meet client at scheduled location</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div className="p-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <h3 className="font-semibold text-gray-900 mb-4">Client Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                      <div>
                        <p className="font-bold text-xl text-gray-900">{selectedBooking.victim_name}</p>
                        <p className="text-sm text-gray-600">Preferred Language: {selectedBooking.preferred_language}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
                      <p className="text-sm font-mono text-gray-700 break-all">
                        📞 {selectedBooking.victim_phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Note */}
                {selectedBooking.victim_note && (
                  <div className="p-6 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💬</span> Client Note
                    </h3>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-yellow-400">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {selectedBooking.victim_note}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancelled By */}
                {selectedBooking.status === 'cancelled' && selectedBooking.cancelled_by && (
                  <div className="p-6 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" /> Cancellation Info
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-400">
                        <p className="text-sm text-gray-500 font-medium mb-1">Cancelled By</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {selectedBooking.cancelled_by === selectedBooking.victim_email
                            ? '👤 Client'
                            : selectedBooking.cancelled_by === 'advisor'
                            ? '🧑‍💼 Adviser'
                            : `🧑‍💼 Adviser (${selectedBooking.cancelled_by})`}
                        </p>
                      </div>
                      {selectedBooking.cancelled_reason && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-rose-300">
                          <p className="text-sm text-gray-500 font-medium mb-1">Reason</p>
                          <p className="text-gray-800">{selectedBooking.cancelled_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reschedule Info */}
                {selectedBooking.rescheduled_by && (
                  <div className="p-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-xl">🔄</span> Reschedule Info
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-400">
                        <p className="text-sm text-gray-500 font-medium mb-1">Rescheduled By</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {selectedBooking.rescheduled_by === selectedBooking.victim_email
                            ? '👤 Client'
                            : `🧑‍💼 Adviser (${selectedBooking.rescheduled_by})`}
                        </p>
                      </div>
                      {selectedBooking.rescheduled_reason && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-300">
                          <p className="text-sm text-gray-500 font-medium mb-1">Reason</p>
                          <p className="text-gray-800">{selectedBooking.rescheduled_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {selectedBooking.status === 'upcoming' && (() => {
                  const meetingStarted = hasMeetingStarted(selectedBooking);
                  const isLoadingAction = actionLoading !== '';

                  return (
                    <div className="pt-8 border-t border-gray-200">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2 text-center">Quick Actions</h3>

                      {!meetingStarted && (
                        <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>
                            <strong>Mark Completed</strong> and <strong>Mark No Show</strong> will be available after the meeting starts at{' '}
                            <strong>{formatUKTime(selectedBooking.start_time)}</strong>.
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="relative group">
                          <Button
                            className="w-full h-14 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={!meetingStarted || isLoadingAction}
                            onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4" />
                            {actionLoading === 'completed' ? 'Saving...' : 'Mark Completed'}
                          </Button>
                          {!meetingStarted && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex whitespace-nowrap bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg z-50">
                              Available after meeting starts
                            </div>
                          )}
                        </div>

                        <div className="relative group">
                          <Button
                            variant="outline"
                            className="w-full h-14 text-sm font-semibold border-gray-300 hover:bg-gray-50 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={!meetingStarted || isLoadingAction}
                            onClick={() => updateBookingStatus(selectedBooking.id, 'no_show')}
                          >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            {actionLoading === 'no_show' ? 'Saving...' : 'Mark No Show'}
                          </Button>
                          {!meetingStarted && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex whitespace-nowrap bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 shadow-lg z-50">
                              Available after meeting starts
                            </div>
                          )}
                        </div>

                        <Button
                          variant="destructive"
                          className="w-full h-14 text-sm font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-xl disabled:opacity-50"
                          disabled={isLoadingAction}
                          onClick={() => handleCancel(selectedBooking)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Booking'}
                        </Button>

                        <Button
                          className="w-full h-14 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl disabled:opacity-50"
                          disabled={isLoadingAction}
                          onClick={() => {
                            setSelectedBooking(null);
                            navigate(`/volunteer/bookings/${selectedBooking.id}/reschedule`);
                          }}
                        >
                          <span className="mr-1.5">🔄</span>
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </VolunteerLayout>
  );
}