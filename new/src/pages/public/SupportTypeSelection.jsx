import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import SOSButton from '../../components/shared/SOSButton';
import { SUPPORT_CATEGORIES } from '../../lib/utils';
import { useBookingStore } from '../../stores/bookingStore';

export default function SupportTypeSelection() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const { setBookingData } = useBookingStore();

  const handleNext = () => {
    if (selectedCategory) {
      setBookingData({ support_category: selectedCategory });
      navigate('/booking/select-volunteer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SOSButton />
     
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              How Can We Help You?
            </h1>
            <p className="text-gray-600">
              Select the type of support you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedCategory === key ? 'ring-2 ring-blue-600' : ''
                }`}
                onClick={() => setSelectedCategory(key)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-4xl">{category.icon}</span>
                    <CardTitle className="text-xl">{category.label}</CardTitle>
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back
            </Button>
            <Button  variant="outline"
              onClick={handleNext}
              disabled={!selectedCategory}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
