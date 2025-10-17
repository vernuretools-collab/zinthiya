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
import { Calendar, Phone, MapPin, Search, Clock, CheckCircle, XCircle } from 'lucide-react';
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Manage your appointments</p>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reference or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>

              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{filteredBookings.length} Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No bookings found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusBadge(booking.status)}
                            <Badge className={SUPPORT_CATEGORIES[booking.support_category]?.color}>
                              {SUPPORT_CATEGORIES[booking.support_category]?.icon}{' '}
                              {SUPPORT_CATEGORIES[booking.support_category]?.label}
                            </Badge>
                          </div>

                          <p className="font-semibold text-lg mb-1">
                            {booking.booking_reference}
                          </p>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(booking.start_time.toDate(), 'EEEE, MMMM d, yyyy')}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(booking.start_time.toDate(), 'h:mm a')} - 
                                {format(booking.end_time.toDate(), ' h:mm a')}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {booking.consultation_type === 'phone' ? (
                                <>
                                  <Phone className="h-4 w-4" />
                                  <span>Phone Call</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4" />
                                  <span>In-Person</span>
                                </>
                              )}
                            </div>

                            <p>Client: {booking.victim_name}</p>
                          </div>
                        </div>

                        <Button size="sm">View Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Reference: {selectedBooking?.booking_reference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Support Type</p>
                  <Badge className={SUPPORT_CATEGORIES[selectedBooking.support_category]?.color}>
                    {SUPPORT_CATEGORIES[selectedBooking.support_category]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Date & Time</p>
                <p className="font-semibold">
                  {format(selectedBooking.start_time.toDate(), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-gray-600">
                  {format(selectedBooking.start_time.toDate(), 'h:mm a')} - 
                  {format(selectedBooking.end_time.toDate(), ' h:mm a')}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Consultation Type</p>
                <div className="flex items-center space-x-2">
                  {selectedBooking.consultation_type === 'phone' ? (
                    <>
                      <Phone className="h-5 w-5 text-blue-600" />
                      <span>Phone Call</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span>In-Person Meeting</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Client Information</p>
                <p className="font-semibold">{selectedBooking.victim_name}</p>
                <p className="text-gray-600">
                  Phone: {maskPhoneNumber(selectedBooking.victim_phone)}
                </p>
                <p className="text-gray-600">Language: {selectedBooking.preferred_language}</p>
              </div>

              {selectedBooking.victim_note && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Client Note</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedBooking.victim_note}
                  </p>
                </div>
              )}

              {selectedBooking.status === 'upcoming' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
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
