import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import { Users, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalVolunteers: 0,
    activeVolunteers: 0,
    totalBookings: 0,
    upcomingBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // Volunteers stats
        const volunteersSnapshot = await getDocs(collection(db, 'volunteers'));
        const totalV = volunteersSnapshot.size;
        const activeV = volunteersSnapshot.docs.filter(doc => doc.data().is_active).length;

        // Bookings stats
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const totalB = bookingsSnapshot.size;
        const upcomingB = bookingsSnapshot.docs.filter(doc => doc.data().status === 'upcoming').length;

        setStats({
          totalVolunteers: totalV,
          activeVolunteers: activeV,
          totalBookings: totalB,
          upcomingBookings: upcomingB
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        {loading ? (
          <p>Loading statistics...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Volunteers" value={stats.totalVolunteers} icon={Users} color="blue" />
            <StatCard title="Active Volunteers" value={stats.activeVolunteers} icon={CheckCircle} color="green" />
            <StatCard title="Total Bookings" value={stats.totalBookings} icon={Calendar} color="orange" />
            <StatCard title="Upcoming Bookings" value={stats.upcomingBookings} icon={Clock} color="purple" />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
