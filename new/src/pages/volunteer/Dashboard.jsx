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
import { format, isToday } from 'date-fns';
import { SUPPORT_CATEGORIES } from '../../lib/utils';

export default function VolunteerDashboard() {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    rating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchDashboardData();
  }, []);

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
          rating: volunteerData.average_rating || 0
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('volunteer_id', '==', userId),
        where('status', '==', 'upcoming'),
        orderBy('start_time', 'asc'),
        limit(10)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsList = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const todayList = bookingsList.filter(booking => 
        isToday(booking.start_time.toDate())
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {volunteer?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 mt-1">Here's your schedule for today</p>
          </div>
          <Avatar className="h-16 w-16">
            <AvatarImage src={volunteer?.profile_image_url} />
            <AvatarFallback>
              {volunteer?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ⭐ {stats.rating.toFixed(1)}/5
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments today. Enjoy your free time!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings.map((booking) => (
                  <Card key={booking.id} className="border-l-4 border-l-blue-600">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={SUPPORT_CATEGORIES[booking.support_category]?.color}>
                              {SUPPORT_CATEGORIES[booking.support_category]?.label}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {getTimeUntilSession(booking.start_time)}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {format(booking.start_time.toDate(), 'h:mm a')} - 
                              {format(booking.end_time.toDate(), ' h:mm a')}
                            </p>
                            <p className="text-sm text-gray-600">
                              Client: {booking.victim_name}
                            </p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
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
                          </div>
                        </div>

                        <Button 
                          size="sm"
                          onClick={() => navigate(`/volunteer/bookings`)}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-20"
            onClick={() => navigate('/volunteer/bookings')}
          >
            <div className="text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2" />
              <span>View All Bookings</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-20"
            onClick={() => navigate('/volunteer/availability')}
          >
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-2" />
              <span>Manage Availability</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-20"
            onClick={() => navigate('/volunteer/profile')}
          >
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-2" />
              <span>Update Profile</span>
            </div>
          </Button>
        </div>
      </div>
    </VolunteerLayout>
  );
}
