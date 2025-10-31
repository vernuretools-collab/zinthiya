import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import "./index.css"

// Public Pages
import LandingPage from './pages/public/LandingPage';
import SupportTypeSelection from './pages/public/SupportTypeSelection';
import VolunteerSelection from './pages/public/VolunteerSelection';
import TimeSelection from './pages/public/TimeSelection';
import BookingDetails from './pages/public/BookingDetails';
import ConfirmationPage from './pages/public/ConfirmationPage';

// Volunteer Pages
import VolunteerLogin from './pages/volunteer/Login';
import VolunteerRegister from './pages/volunteer/Register';
import VolunteerDashboard from './pages/volunteer/Dashboard';
import VolunteerBookings from './pages/volunteer/Bookings';
import VolunteerAvailability from './pages/volunteer/Availability';
import VolunteerProfile from './pages/volunteer/Profile';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import Volunteers from './pages/admin/Volunteers';
import Bookings from './pages/admin/Bookings';
import Reports from './pages/admin/Reports';

// Protected Route Component
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/volunteer/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking/support-type" element={<SupportTypeSelection />} />
        <Route path="/booking/select-volunteer" element={<VolunteerSelection />} />
        <Route path="/booking/select-time" element={<TimeSelection />} />
        <Route path="/booking/details" element={<BookingDetails />} />
        <Route path="/booking/confirmation" element={<ConfirmationPage />} />

        {/* Volunteer Auth Routes */}
        <Route path="/volunteer/login" element={<VolunteerLogin />} />
        <Route path="/volunteer/register" element={<VolunteerRegister />} />

        {/* Protected Volunteer Routes */}
        <Route
          path="/volunteer/dashboard"
          element={
            <ProtectedRoute>
              <VolunteerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/bookings"
          element={
            <ProtectedRoute>
              <VolunteerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/availability"
          element={
            <ProtectedRoute>
              <VolunteerAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/profile"
          element={
            <ProtectedRoute>
              <VolunteerProfile />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/volunteers"
          element={
            <ProtectedRoute>
              <Volunteers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
