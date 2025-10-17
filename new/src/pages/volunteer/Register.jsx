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
import { Badge } from '../../components/ui/badge';
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Heart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Become a Volunteer</h1>
            <p className="text-gray-600">Join our team and make a difference</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Volunteer Application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 or 0 followed by 10 digits"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirm Password *</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => handleChange('confirm_password', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio (50-200 characters) *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Tell us about yourself and why you want to volunteer..."
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/200 characters
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block">Support Categories *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleArrayItem('support_categories', key)}
                        className={`
                          p-3 rounded-lg border-2 text-left transition-all
                          ${formData.support_categories.includes(key)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{category.icon}</span>
                          <span className="text-sm font-medium">{category.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Languages You Speak *</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LANGUAGES).map(([code, lang]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArrayItem('languages', code)}
                        className={`
                          px-4 py-2 rounded-full border-2 transition-all
                          ${formData.languages.includes(code)
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={(e) => handleChange('terms_accepted', e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to undergo background checks, attend training sessions, 
                      and maintain confidentiality in accordance with Zinthiya Trust policies *
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>

                <p className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/volunteer/login" className="text-blue-600 hover:underline">
                    Login here
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
