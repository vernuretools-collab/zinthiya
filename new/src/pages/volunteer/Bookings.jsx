import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import CalendarView from '../../components/volunteer/CalendarView';
import { Calendar, Phone, MapPin, Search, Clock, CheckCircle, XCircle, List, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { SUPPORT_CATEGORIES, maskPhoneNumber } from '../../lib/utils';

export default function VolunteerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');

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

  const fetchBookings = async () => {
    try {
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
    }
  };

  const filterBookings = () => {
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
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updated_at: new Date()
      });

      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      );

      setSelectedBooking(null);
      alert(`Booking marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking status');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      upcoming: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status] || variants.upcoming}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStatusCount = (status) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(b => b.status === status).length;
  };

  if (loading) {
    return (
      <VolunteerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </VolunteerLayout>
    );
  }

  return (
    <VolunteerLayout>
      <div className="space-y-4 sm:space-y-6 ">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-3xl md:text-3xl  font-bold text-gray-900">
            My Bookings
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your appointments
          </p>
        </div>

        {/* Status Filter Tabs */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="flex border-b overflow-x-auto scrollbar-hide">
              {[
                { key: 'all', label: 'All Bookings' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-1 min-w-[100px] cursor-pointer sm:min-w-[120px] px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors relative ${
                    statusFilter === tab.key
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-center">{tab.label}</span>
                    <span className="text-xs font-normal">
                      ({getStatusCount(tab.key)})
                    </span>
                  </div>
                  {statusFilter === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
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
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border-2 border-gray-200 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar View</span>
            </button>
          </div>
        </div>

        {/* Conditional Rendering: Calendar or List */}
        {viewMode === 'calendar' ? (
          <CalendarView 
            bookings={filteredBookings}
            onBookingClick={setSelectedBooking}
          />
        ) : (
          <Card className="border-0 shadow-md">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl">
                {filteredBookings.length} Booking{filteredBookings.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-500">
                    No bookings found
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-600"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <CardContent className="p-3 sm:p-4 md:p-5">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 w-full sm:w-auto">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                              {getStatusBadge(booking.status)}
                              <Badge className={`${SUPPORT_CATEGORIES[booking.support_category]?.color} text-xs`}>
                                {SUPPORT_CATEGORIES[booking.support_category]?.icon}{' '}
                                {SUPPORT_CATEGORIES[booking.support_category]?.label}
                              </Badge>
                            </div>

                            {/* Reference */}
                            <p className="font-semibold text-base sm:text-lg md:text-xl mb-2 break-all">
                              {booking.booking_reference}
                            </p>

                            {/* Details */}
                            <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="break-words">
                                  {format(booking.start_time.toDate(), 'EEEE, MMMM d, yyyy')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>
                                  {format(booking.start_time.toDate(), 'h:mm a')} - 
                                  {format(booking.end_time.toDate(), ' h:mm a')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {booking.consultation_type === 'phone' ? (
                                  <>
                                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span>Phone Call</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span>In-Person</span>
                                  </>
                                )}
                              </div>

                              <p className="font-medium">Client: {booking.victim_name}</p>
                            </div>
                          </div>

                          {/* View Details Button */}
                          <Button 
                            size="sm" 
                            className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Booking Details Dialog - Responsive */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl pr-8">
              Booking Details
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-all">
              Reference: {selectedBooking?.booking_reference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Status & Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                    Status
                  </p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                    Support Type
                  </p>
                  <Badge className={SUPPORT_CATEGORIES[selectedBooking.support_category]?.color}>
                    {SUPPORT_CATEGORIES[selectedBooking.support_category]?.label}
                  </Badge>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Date & Time
                </p>
                <p className="font-semibold text-sm sm:text-base">
                  {format(selectedBooking.start_time.toDate(), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {format(selectedBooking.start_time.toDate(), 'h:mm a')} - 
                  {format(selectedBooking.end_time.toDate(), ' h:mm a')}
                </p>
              </div>

              {/* Consultation Type */}
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Consultation Type
                </p>
                <div className="flex items-center gap-2">
                  {selectedBooking.consultation_type === 'phone' ? (
                    <>
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Phone Call</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm sm:text-base">In-Person Meeting</span>
                    </>
                  )}
                </div>
              </div>

              {/* Client Information */}
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Client Information
                </p>
                <p className="font-semibold text-sm sm:text-base">{selectedBooking.victim_name}</p>
                <p className="text-xs sm:text-sm text-gray-600 break-all">
                  Phone: {maskPhoneNumber(selectedBooking.victim_phone)}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Language: {selectedBooking.preferred_language}
                </p>
              </div>

              {/* Client Note */}
              {selectedBooking.victim_note && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5 sm:mb-2">
                    Client Note
                  </p>
                  <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-md leading-relaxed">
                    {selectedBooking.victim_note}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedBooking.status === 'upcoming' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    className="flex-1 text-sm sm:text-base h-11 sm:h-12"
                    onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-sm sm:text-base h-11 sm:h-12"
                    onClick={() => updateBookingStatus(selectedBooking.id, 'no_show')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Mark as No Show
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VolunteerLayout>
  );
}
