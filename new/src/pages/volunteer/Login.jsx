import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, Heart } from 'lucide-react';

export default function VolunteerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/volunteer/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <Heart className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-blue-600 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900">
            Volunteer Login
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">
            Zinthiya Ganeshpanchan Trust
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-md sm:shadow-lg bg-white">
          <CardHeader className="p-4 sm:p-5 md:p-6 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-gray-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm md:text-base text-gray-600">
              Login to access your volunteer dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              
              {/* Email Field */}
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm sm:text-base font-semibold text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="volunteer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base border-2 focus:ring-2 focus:ring-blue-500"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-sm sm:text-base font-semibold text-gray-700"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base border-2 focus:ring-2 focus:ring-blue-500"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-2">
                <Button 
                  type="submit" 
                  className="w-full sm:w-40 md:w-44 h-11 sm:h-12 md:h-13
                            text-white bg-black hover:bg-gray-800
                            text-sm sm:text-base md:text-lg font-semibold
                            transition-all duration-300
                            shadow-md hover:shadow-lg
                            disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span>Logging in...</span>
                    </span>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>

              {/* Links Section */}
              <div className="text-center space-y-2 sm:space-y-2.5 text-xs sm:text-sm md:text-base pt-2">
                <p className="text-gray-600">
                  New volunteer?{' '}
                  <Link 
                    to="/volunteer/register" 
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                  >
                    Apply here
                  </Link>
                </p>
                {/* Uncomment if needed */}
                {/* <p>
                  <Link 
                    to="/volunteer/forgot-password" 
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </p> */}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info (Optional) */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Having trouble logging in?{' '}
            <a 
              href="mailto:support@zinthiyatrust.org" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
