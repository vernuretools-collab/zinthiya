import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import SOSButton from '../../components/shared/SOSButton';
import { Shield, Heart, Phone, Calendar } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <SOSButton />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  Zinthiya
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Leicester, UK</p>
              </div>
            </div>
            
            
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            Get Free, Confidential Support When You Need It
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
            Professional guidance for domestic abuse, debt advice, welfare support, and counselling
          </p>
          
          {/* Get Support Button - With Border & Radius */}
          <Button 
            size="lg" 
            className="text-white sm:text-lg md:text-xl 
                       px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-7
                       rounded-xl sm:rounded-2xl
                       shadow-xl hover:shadow-2xl
                       transition-all duration-300
                       bg-black hover:bg-white hover:text-black
                       font-bold
                       w-full sm:w-auto
                       max-w-sm cursor-pointer"
            onClick={() => navigate('/booking/support-type')}
          >
            <Calendar className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            Get Support
          </Button>
          
          
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 p-4 sm:p-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none shadow-sm sm:shadow-none">
              <Shield className="h-6 w-6 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center sm:text-left">
                100% Confidential
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 p-4 sm:p-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none shadow-sm sm:shadow-none">
              <Heart className="h-6 w-6 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center sm:text-left">
                Free Service
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 p-4 sm:p-0 bg-white sm:bg-transparent rounded-lg sm:rounded-none shadow-sm sm:shadow-none">
              <Phone className="h-6 w-6 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
              <span className="text-sm sm:text-xs md:text-sm font-medium text-center sm:text-left">
                Trained Volunteers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
            How We Can Help
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">🛡️ Domestic Abuse</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Safe, confidential support for those experiencing domestic abuse
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">💰 Debt Advice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Expert guidance on managing debt and financial difficulties
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">🏠 Welfare Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Help with benefits, housing, and welfare assistance
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">💬 Counselling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  General emotional and mental health support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">About Us</CardTitle>
            <CardDescription>Supporting Leicester Communities Since 2020</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Zinthiya Ganeshpanchan Trust is a Leicester-based charity dedicated to supporting 
              individuals and families affected by domestic abuse, financial hardship, and other 
              life challenges. Our trained volunteers provide compassionate, confidential support 
              tailored to your needs.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>📍 Visit us:</strong> 12 Bishop Street, Leicester LE1 6AF<br />
                <strong>📞 Call us:</strong> 0116 254 5168<br />
                <strong>✉️ Email:</strong> info@zinthiyatrust.org
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 sm:py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm sm:text-base mb-2">
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
