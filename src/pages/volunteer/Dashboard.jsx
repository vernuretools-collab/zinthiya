import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import { Calendar, Clock, Star, Users, Phone, MapPin } from 'lucide-react';
// ✅ Removed isToday import — replaced with UK timezone comparison
import { SUPPORT_CATEGORIES } from '../../lib/utils';

export default function VolunteerDashboard() {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    rating: 0,
    ratingCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchDashboardData();
  }, []);

  // ✅ Compare dates in UK timezone — not browser-local IST
  const toUKDateStr = (d) =>
    d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // "YYYY-MM-DD"

  const fetchDashboardData = async () => {
    try {
      const userId = auth.currentUser.uid;

      const volunteerDocRef = doc(db, 'volunteers', userId);
      const volunteerDoc = await getDoc(volunteerDocRef);

      if (volunteerDoc.exists()) {
        const volunteerData = { id: volunteerDoc.id, ...volunteerDoc.data() };
        setVolunteer(volunteerData);
        setStats({
          today: 0,
          thisWeek: 0,
          thisMonth: volunteerData.total_sessions || 0,
          rating: volunteerData.average_rating || 0,
          ratingCount: volunteerData.rating_count || 0
        });
      }

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('volunteer_id', '==', userId),
        where('status', 'in', ['upcoming', 'active']),
        orderBy('start_time', 'asc'),
        limit(10)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsList = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ Fixed: UK timezone today check, not IST browser-local
      const todayUK = toUKDateStr(new Date());
      const todayList = bookingsList.filter(booking =>
        toUKDateStr(booking.start_time.toDate()) === todayUK
      );

      setTodayBookings(todayList);
      setStats(prev => ({ ...prev, today: todayList.length }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilSession = (startTime) => {
    const now = new Date();
    const sessionTime = startTime.toDate();
    const diff = sessionTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) return 'Started';
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  // ✅ UK time in 12-hour AM/PM format
const formatUKTime = (timestamp) => {
  return timestamp.toDate().toLocaleTimeString('en-US', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

  const renderStars = (rating) => {
    const roundedRating = Math.round(rating || 0);
    return (
      <div className="flex -space-x-1 items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className={`text-lg transition-all ${
              star <= roundedRating
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                : 'text-gray-300'
            }`}
          >
            ★
          </div>
        ))}
      </div>
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
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0 bg-gradient-to-b from-blue-50 to-white">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
              Welcome back, {volunteer?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Here's your schedule for today
            </p>
          </div>
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 ring-2 ring-blue-100">
            <AvatarImage src={volunteer?.profile_image_url} />
            <AvatarFallback className="bg-blue-600 text-white text-sm sm:text-base md:text-lg font-bold">
              {volunteer?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                Today's Sessions
              </CardTitle>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                {stats.today}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                This Week
              </CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                {stats.thisWeek}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                This Month
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                {stats.thisMonth}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">
                Your Rating
              </CardTitle>
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2">
              <div className="flex items-center justify-center mb-2">
                {renderStars(stats.rating)}
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {stats.rating.toFixed(1)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  ({stats.ratingCount} {stats.ratingCount === 1 ? 'review' : 'reviews'})
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card className="border-0 shadow-md sm:shadow-lg">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-gray-900">
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
            {todayBookings.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500">
                  No appointments today. Enjoy your free time!
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {todayBookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3 sm:p-4 md:p-5">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 w-full sm:w-auto">
                          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                            <Badge className={`${SUPPORT_CATEGORIES[booking.support_category]?.color} text-xs`}>
                              {SUPPORT_CATEGORIES[booking.support_category]?.label}
                            </Badge>
                            <span className="text-xs sm:text-sm text-gray-500 font-medium">
                              {getTimeUntilSession(booking.start_time)}
                            </span>
                          </div>

                          <div className="space-y-1 sm:space-y-1.5">
                            <p className="font-semibold text-sm sm:text-base md:text-lg text-gray-900">
                              {formatUKTime(booking.start_time)} – {formatUKTime(booking.end_time)}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              <strong>Client:</strong> {booking.victim_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
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
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => navigate('/volunteer/bookings')}
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 sm:py-5 md:py-6 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
            onClick={() => navigate('/volunteer/bookings')}
          >
            <div className="text-center">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-blue-600" />
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                View All Bookings
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 sm:py-5 md:py-6 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
            onClick={() => navigate('/volunteer/availability')}
          >
            <div className="text-center">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-green-600" />
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                Manage Availability
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 sm:py-5 md:py-6 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
            onClick={() => navigate('/volunteer/profile')}
          >
            <div className="text-center">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-purple-600" />
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                Update Profile
              </span>
            </div>
          </Button>
        </div>

      </div>
    </VolunteerLayout>
  );
}
