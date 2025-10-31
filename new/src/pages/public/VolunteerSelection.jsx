import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import SOSButton from '../../components/shared/SOSButton';
import { useBookingStore } from '../../stores/bookingStore';
import { SUPPORT_CATEGORIES, LANGUAGES } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export default function VolunteerSelection() {
  const navigate = useNavigate();
  const { bookingData, setBookingData } = useBookingStore();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');

  useEffect(() => {
    fetchVolunteers();
  }, [bookingData.support_category]);

  const fetchVolunteers = async () => {
    try {
      const q = query(
        collection(db, 'volunteers'),
        where('support_categories', 'array-contains', bookingData.support_category),
        where('is_verified', '==', true),
        where('is_active', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const volunteersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setVolunteers(volunteersList);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {  
    if (selectedVolunteer) {
      setBookingData({ volunteer_id: selectedVolunteer });
      navigate('/booking/select-time');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-indigo-500" />
          <p className="text-slate-600 text-sm sm:text-base">Loading volunteers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <SOSButton />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 md:mb-10 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-2 sm:mb-3 select-none animate-fade-in-up leading-tight">
              Select a Volunteer
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 leading-relaxed select-none animate-fade-in-up delay-150">
              Choose a volunteer for {SUPPORT_CATEGORIES[bookingData.support_category]?.label}
            </p>
          </div>

          {/* No Volunteers Available */}
          {volunteers.length === 0 ? (
            <Card className="bg-white shadow-lg border-0 animate-fade-in-up mx-2 sm:mx-0">
              <CardContent className="py-8 sm:py-12 px-4 sm:px-6 text-center">
                <p className="text-slate-600 text-sm sm:text-base md:text-lg italic select-none leading-relaxed">
                  No volunteers available for this service at the moment.
                  <br className="hidden sm:block" />
                  Please try again later or contact us directly.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Volunteers Grid - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-6 sm:mb-8">
                {volunteers.map((volunteer) => (
                  <Card
                    key={volunteer.id}
                    className={`cursor-pointer border-2 rounded-lg sm:rounded-xl bg-white shadow-md transition-all duration-300 ease-in-out
                      ${selectedVolunteer === volunteer.id 
                        ? ' ring-indigo-400 shadow-2xl scale-[1.02] sm:scale-105 border-indigo-300' 
                        : 'border-transparent hover:shadow-xl hover:scale-[1.01] sm:hover:scale-105 hover:ring-2 hover:ring-indigo-200'}
                      `}
                    onClick={() => setSelectedVolunteer(volunteer.id)}
                  >
                    <CardHeader className="flex flex-col items-center text-center p-4 sm:p-5 md:p-6 pt-5 sm:pt-6 md:pt-8">
                      {/* Avatar */}
                      <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mb-3 sm:mb-4 shadow-md ring-4 ring-indigo-100 rounded-full">
                        <AvatarImage src={volunteer.profile_image_url} alt={volunteer.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-blue-500 text-white text-lg sm:text-xl font-bold">
                          {volunteer.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Name */}
                      <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-tight">
                        {volunteer.full_name}
                      </CardTitle>
                      
                      {/* Bio */}
                      <CardDescription className="mt-2 text-slate-600 line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm leading-relaxed">
                        {volunteer.bio}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
                      <div className="space-y-2 sm:space-y-3">
                        {/* Languages */}
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Languages:</p>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {volunteer.languages?.map((lang) => (
                              <span
                                key={lang}
                                className="inline-flex items-center text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200 select-none font-medium"
                              >
                                {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <p className="text-xs sm:text-sm text-slate-600 font-medium">
                            📅 {volunteer.total_sessions || 0} sessions completed
                          </p>
                          {volunteer.average_rating && (
                            <p className="text-xs sm:text-sm text-slate-600 font-medium">
                              ⭐ {volunteer.average_rating.toFixed(1)}/5
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Helper Text */}
              {!selectedVolunteer && (
                <p className="text-center text-slate-500 text-xs sm:text-sm mb-6 px-4">
                  Select a volunteer to view their availability
                </p>
              )}
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 px-2 sm:px-0">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-2 sm:order-1
                        border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400
                        text-slate-700 font-semibold 
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        shadow-sm hover:shadow-md" 
              onClick={() => navigate('/booking/support-type')}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedVolunteer}
              className={`w-full sm:w-auto order-1 sm:order-2
                        font-bold 
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        rounded-md
                        ${
                          selectedVolunteer
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md hover:shadow-xl scale-100 hover:scale-105'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-sm'
                        }`}
            >
              View Availability
            </Button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease forwards;
        }
        .animate-fade-in-up.delay-150 {
          animation-delay: 0.15s;
        }
      `}</style>
    </div>
  );
}
