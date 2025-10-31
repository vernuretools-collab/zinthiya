import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import { SUPPORT_CATEGORIES, LANGUAGES } from '../../lib/utils';
import { User, Lock, Save, Loader2 } from 'lucide-react';

export default function VolunteerProfile() {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    support_categories: [],
    languages: []
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = auth.currentUser.uid;
      const volunteerDoc = await getDoc(doc(db, 'volunteers', userId));
      
      if (volunteerDoc.exists()) {
        const data = { id: volunteerDoc.id, ...volunteerDoc.data() };
        setVolunteer(data);
        setEditedData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          bio: data.bio || '',
          support_categories: data.support_categories || [],
          languages: data.languages || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userId = auth.currentUser.uid;
      await updateDoc(doc(db, 'volunteers', userId), {
        ...editedData,
        updated_at: new Date()
      });
      
      setVolunteer(prev => ({ ...prev, ...editedData }));
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. You may need to log in again.');
    }
  };

  const toggleArrayItem = (field, item) => {
    setEditedData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  if (loading) {
    return (
      <VolunteerLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </VolunteerLayout>
    );
  }

  return (
    <VolunteerLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl md:text-3xl font-bold text-gray-900">
              My Profile
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage your volunteer information
            </p>
          </div>
          {!editing && (
            <Button 
              onClick={() => setEditing(true)}
              className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
            >
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Information Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-5 sm:space-y-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-blue-100">
                <AvatarImage src={volunteer?.profile_image_url} />
                <AvatarFallback className="text-xl sm:text-2xl bg-blue-600 text-white">
                  {volunteer?.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                  {volunteer?.full_name}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 break-all">
                  {volunteer?.email}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                  <Badge 
                    variant={volunteer?.is_verified ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {volunteer?.is_verified ? '✓ Verified' : 'Pending Verification'}
                  </Badge>
                  <Badge 
                    variant={volunteer?.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {volunteer?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Editing Mode */}
            {editing ? (
              <div className="space-y-4 sm:space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm sm:text-base font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={editedData.full_name}
                    onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm sm:text-base font-semibold">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={editedData.bio}
                    onChange={(e) => setEditedData({ ...editedData, bio: e.target.value })}
                    maxLength={200}
                    className="text-sm sm:text-base min-h-[100px]"
                  />
                  <p className="text-xs sm:text-sm text-gray-500">
                    {editedData.bio?.length || 0}/200 characters
                  </p>
                </div>

                {/* Support Categories */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base font-semibold block">
                    Support Categories
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleArrayItem('support_categories', key)}
                        className={`
                          p-3 sm:p-4 rounded-lg border-2 text-left transition-all duration-200
                          ${editedData.support_categories.includes(key)
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }
                        `}
                      >
                        <span className="text-xs sm:text-sm md:text-base font-medium">
                          {category.icon} {category.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base font-semibold block">
                    Languages
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LANGUAGES).map(([code, lang]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArrayItem('languages', code)}
                        className={`
                          px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border-2 transition-all duration-200
                          text-xs sm:text-sm font-medium
                          ${editedData.languages.includes(code)
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }
                        `}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditedData({
                        full_name: volunteer?.full_name || '',
                        phone: volunteer?.phone || '',
                        bio: volunteer?.bio || '',
                        support_categories: volunteer?.support_categories || [],
                        languages: volunteer?.languages || []
                      });
                    }}
                    disabled={saving}
                    className="w-full sm:flex-1 h-11 sm:h-12 text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="w-full sm:flex-1 h-11 sm:h-12 text-sm sm:text-base"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <Label className="text-sm sm:text-base font-semibold">Phone</Label>
                  <p className="text-sm sm:text-base text-gray-700 mt-1">
                    {volunteer?.phone || 'Not provided'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-semibold">Bio</Label>
                  <p className="text-sm sm:text-base text-gray-700 mt-1 leading-relaxed">
                    {volunteer?.bio}
                  </p>
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-semibold">
                    Support Categories
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {volunteer?.support_categories?.map((cat) => (
                      <Badge 
                        key={cat} 
                        className={`${SUPPORT_CATEGORIES[cat]?.color} text-xs`}
                      >
                        {SUPPORT_CATEGORIES[cat]?.icon} {SUPPORT_CATEGORIES[cat]?.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-semibold">Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {volunteer?.languages?.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-xs">
                        {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm sm:text-base font-semibold">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 8 characters"
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-semibold">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            <Button 
              onClick={handleChangePassword}
              className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
            >
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 text-center">
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
                  {volunteer?.total_sessions || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Total Sessions
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
                  {volunteer?.average_rating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Average Rating
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
                  {volunteer?.created_at ? new Date(volunteer.created_at.seconds * 1000).getFullYear() : 'N/A'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Member Since
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VolunteerLayout>
  );
}
