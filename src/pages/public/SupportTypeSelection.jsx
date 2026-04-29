// SupportTypeSelection.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { SUPPORT_CATEGORIES, CRISIS_HELPLINE } from '../../lib/utils';
import { useBookingStore } from '../../stores/bookingStore';
import { MdPhone, MdEmail, MdArrowBack } from 'react-icons/md';


// ─── Contact page shown when "Others" is selected ────────────────────────────
function OthersContactPage({ onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">

          {/* ── Top-right back button ── */}
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2 border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400
                         text-slate-700 font-semibold px-4 py-2 sm:px-5 sm:py-2.5
                         text-sm sm:text-base transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <MdArrowBack className="text-lg" />
              Back to Categories
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-2 leading-tight">
              Contact Our Office
            </h1>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg">
              For emergency support, please reach out to us directly
            </p>
          </div>

          {/* Contact Cards */}
          <div className="flex flex-col gap-4 mb-8">

            {/* Phone Card */}
            <Card className="border-2 border-transparent bg-white shadow-md hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
              <CardHeader className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MdPhone className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-slate-800 font-bold">
                      Call Us
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs sm:text-sm">
                      Speak to us directly
                    </CardDescription>
                  </div>
                </div>
                <a
                  href={`tel:${CRISIS_HELPLINE.replace(/\s/g, '')}`}
                  className="mt-4 block text-center bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 shadow-md hover:shadow-lg text-base sm:text-lg"
                >
                  {CRISIS_HELPLINE}
                </a>
              </CardHeader>
            </Card>

            {/* Divider */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email Card */}
            <Card className="border-2 border-transparent bg-white shadow-md hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
              <CardHeader className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MdEmail className="text-2xl text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-slate-800 font-bold">
                      Email Us
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs sm:text-sm">
                      We'll respond as soon as possible
                    </CardDescription>
                  </div>
                </div>
                <a
                  href="mailto:zinthiya.trust@gmail.com"
                  className="mt-4 block text-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 shadow-md hover:shadow-lg text-base sm:text-lg break-all"
                >
                  zinthiya.trust@gmail.com
                </a>
              </CardHeader>
            </Card>

          </div>

          {/* Office Address note */}
          <p className="text-center text-slate-500 text-xs sm:text-sm mb-6">
            📍 12 Bishop Street, Leicester LE1 6AF
          </p>

        </div>
      </div>
    </div>
  );
}


// ─── Main component ────────────────────────────────────────────────────────────
export default function SupportTypeSelection() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showOthersContact, setShowOthersContact] = useState(false);
  const { setBookingData } = useBookingStore();

  const handleCardClick = (key) => {
    if (key === 'emergency_support') {
      setShowOthersContact(true);
      return;
    }
    setSelectedCategory(key);
  };

  const handleNext = () => {
    if (selectedCategory) {
      setBookingData({ support_category: selectedCategory });
      navigate('/booking/select-volunteer');
    }
  };

  if (showOthersContact) {
    return <OthersContactPage onBack={() => setShowOthersContact(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16 sm:pt-20">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="max-w-6xl mx-auto">

          {/* Header Section */}
          <div className="mb-6 sm:mb-8 md:mb-10 text-center px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">
              How Can We Help You?
            </h1>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg lg:text-xl">
              Select the type of support you need
            </p>
          </div>

          {/* Support Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-6 sm:mb-8">
            {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 bg-white shadow-md ${
                  selectedCategory === key
                    ? 'ring-indigo-400 shadow-2xl scale-[1.02] sm:scale-105 border-indigo-300'
                    : 'border-transparent hover:ring-2 hover:ring-indigo-200 hover:scale-[1.01] sm:hover:scale-105'
                }`}
                onClick={() => handleCardClick(key)}
              >
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center gap-3 sm:gap-4 mb-2">
                    <category.icon className="text-xl sm:text-4xl md:text-5xl flex-shrink-0 text-blue-600" />
                    <CardTitle className="text-base sm:text-xl md:text-xl text-slate-800 font-bold leading-tight">
                      {category.label}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-slate-600 text-xs sm:text-sm md:text-base leading-relaxed">
                    {category.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 px-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto order-2 sm:order-1
                        border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400
                        text-slate-700 font-semibold
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        shadow-sm hover:shadow-md"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedCategory}
              className={`w-full sm:w-auto order-1 sm:order-2
                        font-bold
                        px-6 py-5 sm:px-8 sm:py-6
                        text-base sm:text-lg
                        transition-all duration-300
                        rounded-md
                        ${
                          selectedCategory
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md hover:shadow-xl scale-100 hover:scale-105'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-sm'
                        }`}
            >
              Next
            </Button>
          </div>

          {!selectedCategory && (
            <p className="text-center text-slate-500 text-xs sm:text-sm mt-4 px-4">
              Please select a support category to continue
            </p>
          )}

        </div>
      </div>
    </div>
  );
}