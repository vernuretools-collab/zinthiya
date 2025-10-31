import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { SUPPORT_CATEGORIES, LANGUAGES } from '../../lib/utils';
import { Loader2, Heart } from 'lucide-react';

export default function VolunteerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    bio: '',
    support_categories: [],
    languages: [],
    terms_accepted: false
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      alert("Passwords don't match");
      return;
    }

    if (formData.support_categories.length === 0) {
      alert('Please select at least one support category');
      return;
    }

    if (formData.languages.length === 0) {
      alert('Please select at least one language');
      return;
    }

    if (!formData.terms_accepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await setDoc(doc(db, 'volunteers', userCredential.user.uid), {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        support_categories: formData.support_categories,
        languages: formData.languages,
        is_verified: false,
        is_active: false,
        created_at: new Date(),
        total_sessions: 0,
        average_rating: 0
      });

      alert('Application submitted! We will review your application and get back to you soon.');
      navigate('/volunteer/login');
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-6 sm:py-8 md:py-12">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8 px-2">
            <Heart className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-blue-600 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-gray-900">
              Become a Volunteer
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600">
              Join our team and make a difference
            </p>
          </div>

          {/* Registration Form Card */}
          <Card className="border-0 shadow-md sm:shadow-lg bg-white">
            <CardHeader className="p-4 sm:p-5 md:p-6 lg:p-8 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-900">
                Volunteer Application
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8 pt-0">
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                
                {/* Full Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm sm:text-base font-semibold text-gray-700">
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base border-2"
                    required
                  />
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base font-semibold text-gray-700">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="volunteer@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="h-11 sm:h-12 text-sm sm:text-base border-2"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm sm:text-base font-semibold text-gray-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 or 0 followed by 10 digits"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="h-11 sm:h-12 text-sm sm:text-base border-2"
                    />
                  </div>
                </div>

                {/* Password Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm sm:text-base font-semibold text-gray-700">
                      Password *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="h-11 sm:h-12 text-sm sm:text-base border-2"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-sm sm:text-base font-semibold text-gray-700">
                      Confirm Password *
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirm_password}
                      onChange={(e) => handleChange('confirm_password', e.target.value)}
                      className="h-11 sm:h-12 text-sm sm:text-base border-2"
                      required
                    />
                  </div>
                </div>

                {/* Bio Field */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm sm:text-base font-semibold text-gray-700">
                    Bio (50-200 characters) *
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Tell us about yourself and why you want to volunteer..."
                    maxLength={200}
                    className="text-sm sm:text-base border-2 min-h-[100px] sm:min-h-[120px]"
                    required
                  />
                  <p className="text-xs sm:text-sm text-gray-500 ml-1">
                    {formData.bio.length}/200 characters
                  </p>
                </div>

                {/* Support Categories */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base font-semibold text-gray-700 block">
                    Support Categories *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleArrayItem('support_categories', key)}
                        className={`
                          p-3 sm:p-4 rounded-lg border-2 text-left transition-all duration-200
                          ${formData.support_categories.includes(key)
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-xl sm:text-2xl flex-shrink-0">{category.icon}</span>
                          <span className="text-xs sm:text-sm md:text-base font-medium text-gray-700">
                            {category.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 ml-1">
                    Selected: {formData.support_categories.length}
                  </p>
                </div>

                {/* Languages Selection */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base font-semibold text-gray-700 block">
                    Languages You Speak *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LANGUAGES).map(([code, lang]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArrayItem('languages', code)}
                        className={`
                          px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border-2 transition-all duration-200
                          text-xs sm:text-sm md:text-base font-medium
                          ${formData.languages.includes(code)
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                          }
                        `}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 ml-1">
                    Selected: {formData.languages.length}
                  </p>
                </div>

                {/* Terms & Conditions */}
                <div className="border-t-2 pt-4 sm:pt-5">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={(e) => handleChange('terms_accepted', e.target.checked)}
                      className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed group-hover:text-gray-900">
                      I agree to undergo background checks, attend training sessions,
                      and maintain confidentiality in accordance with Zinthiya Trust policies *
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-2">
                  <Button 
                    type="submit" 
                    className="w-full sm:w-48 md:w-52 h-12 sm:h-13 md:h-14
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
                        <span>Submitting...</span>
                      </span>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>

                {/* Login Link */}
                <p className="text-center text-xs sm:text-sm md:text-base text-gray-600 pt-2">
                  Already have an account?{' '}
                  <Link 
                    to="/volunteer/login" 
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                  >
                    Login here
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Need help?{' '}
              <a 
                href="mailto:volunteer@zinthiyatrust.org" 
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
