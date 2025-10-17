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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SOSButton />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Select a Volunteer
            </h1>
            <p className="text-gray-600">
              Choose a volunteer for {SUPPORT_CATEGORIES[bookingData.support_category]?.label}
            </p>
          </div>

          {volunteers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">
                  No volunteers available for this service at the moment.
                  Please try again later or contact us directly.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {volunteers.map((volunteer) => (
                <Card
                  key={volunteer.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${selectedVolunteer === volunteer.id ? 'ring-2 ring-blue-600' : ''
                    }`}
                  onClick={() => setSelectedVolunteer(volunteer.id)}
                >
                  <CardHeader>
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-20 w-20 mb-4">
                        <AvatarImage src={volunteer.profile_image_url} />
                        <AvatarFallback>
                          {volunteer.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-lg">{volunteer.full_name}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-3">
                        {volunteer.bio}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium mb-1">Languages:</p>
                        <div className="flex flex-wrap gap-1">
                          {volunteer.languages?.map((lang) => (
                            <span key={lang} className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {volunteer.total_sessions || 0} sessions completed
                        </p>
                        {volunteer.average_rating && (
                          <p className="text-sm text-gray-600">
                            ⭐ {volunteer.average_rating.toFixed(1)}/5
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-5">
            <Button variant="outline" onClick={() => navigate('/booking/support-type')}>
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={!selectedVolunteer}
            >
              View Availability
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
