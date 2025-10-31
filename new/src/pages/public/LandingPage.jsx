import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import SOSButton from '../../components/shared/SOSButton';
import { Shield, Heart, Phone, Calendar } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white ">
      <SOSButton />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 ">
        <div className="container mx-auto px-4 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Heart className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                  Zinthiya
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Leicester, UK</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 sm:py-8 md:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 leading-tight px-2">
            Get Free, Confidential Support When You Need It
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-5 sm:mb-6 md:mb-8 px-2 sm:px-4 max-w-3xl mx-auto">
            Professional guidance for domestic abuse, debt advice, welfare support, and counselling
          </p>

          {/* Get Support Button - Fully Responsive */}
          <div className="flex justify-center px-4">
            <Button
              size="lg"
              className="text-white text-base sm:text-lg md:text-xl 
                        px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-6
                        rounded-lg sm:rounded-xl md:rounded-2xl
                        shadow-lg hover:shadow-2xl
                        transition-colors duration-700
                        bg-black hover:bg-white hover:text-black
                        font-bold
                        w-40 sm:w-auto
                        max-w-xs sm:max-w-sm
                        cursor-pointer
                        flex items-center justify-center"
              onClick={() => navigate('/booking/support-type')}
            >
              <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 flex-shrink-0" />
              <span>Get Support</span>
            </Button>
          </div>

          {/* Trust Indicators - Enhanced Responsive */}
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-6 sm:mt-8 md:mt-12 px-4 sm:px-4">
            <div className="flex flex-row sm:flex-row items-center justify-center gap-2 sm:gap-2 border border-gray-300 rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <Shield className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center">
                100% Confidential
              </span>
            </div>
            <div className="flex flex-row sm:flex-row items-center justify-center gap-2 sm:gap-2 border border-gray-300 rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <Heart className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center">
                Free Service
              </span>
            </div>
            <div className="flex flex-row sm:flex-row items-center justify-center gap-2 sm:gap-2 border border-gray-300 rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <Phone className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center">
                Trained Volunteers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview - Enhanced Grid */}
      <section className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-6 md:mb-8 text-gray-900 px-2">
            How We Can Help
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Card className="border border-gray-300 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <span>🛡️</span>
                  <span>Domestic Abuse</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Safe, confidential support for those experiencing domestic abuse
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-300 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <span>💰</span>
                  <span>Debt Advice</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Expert guidance on managing debt and financial difficulties
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-300 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <span>🏠</span>
                  <span>Welfare Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Help with benefits, housing, and welfare assistance
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-300 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <span>💬</span>
                  <span>Counselling</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  General emotional and mental health support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <Card className="max-w-3xl mx-auto shadow-lg bg-white">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">About Us</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Supporting Leicester Communities Since 2020
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed">
              Zinthiya Ganeshpanchan Trust is a Leicester-based charity dedicated to supporting
              individuals and families affected by domestic abuse, financial hardship, and other
              life challenges. Our trained volunteers provide compassionate, confidential support
              tailored to your needs.
            </p>
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-2 text-xs sm:text-sm text-gray-700">
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="inline-block min-w-fit">📍 Visit us:</strong>
                  <span>12 Bishop Street, Leicester LE1 6AF</span>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="inline-block min-w-fit">📞 Call us:</strong>
                  <a href="tel:01162545168" className="underline hover:text-blue-700">
                    0116 254 5168
                  </a>
                </p>
                <p className="flex flex-col sm:flex-row sm:gap-2">
                  <strong className="inline-block min-w-fit">✉️ Email:</strong>
                  <a 
                    href="mailto:info@zinthiyatrust.org" 
                    className="underline hover:text-blue-700 break-all"
                  >
                    info@zinthiyatrust.org
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4 sm:py-6 md:py-8 mt-8 sm:mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm md:text-base mb-1 sm:mb-2">
            © 2025 Zinthiya Ganeshpanchan Trust. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            Registered Charity in England and Wales
          </p>
        </div>
      </footer>
    </div>
  );
}
