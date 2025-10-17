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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your volunteer information</p>
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)}>
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={volunteer?.profile_image_url} />
                <AvatarFallback className="text-2xl">
                  {volunteer?.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{volunteer?.full_name}</h3>
                <p className="text-gray-600">{volunteer?.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={volunteer?.is_verified ? 'default' : 'secondary'}>
                    {volunteer?.is_verified ? '✓ Verified' : 'Pending Verification'}
                  </Badge>
                  <Badge variant={volunteer?.is_active ? 'default' : 'secondary'}>
                    {volunteer?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editedData.full_name}
                    onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editedData.bio}
                    onChange={(e) => setEditedData({ ...editedData, bio: e.target.value })}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editedData.bio?.length || 0}/200 characters
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block">Support Categories</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleArrayItem('support_categories', key)}
                        className={`
                          p-3 rounded-lg border-2 text-left transition-all
                          ${editedData.support_categories.includes(key)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        <span className="text-sm font-medium">
                          {category.icon} {category.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LANGUAGES).map(([code, lang]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArrayItem('languages', code)}
                        className={`
                          px-4 py-2 rounded-full border-2 transition-all
                          ${editedData.languages.includes(code)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        {lang.flag} {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t">
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
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
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
              <div className="space-y-4">
                <div>
                  <Label>Phone</Label>
                  <p className="text-gray-700">{volunteer?.phone || 'Not provided'}</p>
                </div>

                <div>
                  <Label>Bio</Label>
                  <p className="text-gray-700">{volunteer?.bio}</p>
                </div>

                <div>
                  <Label>Support Categories</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {volunteer?.support_categories?.map((cat) => (
                      <Badge key={cat} className={SUPPORT_CATEGORIES[cat]?.color}>
                        {SUPPORT_CATEGORIES[cat]?.icon} {SUPPORT_CATEGORIES[cat]?.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {volunteer?.languages?.map((lang) => (
                      <Badge key={lang} variant="outline">
                        {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>

            <Button onClick={handleChangePassword}>
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{volunteer?.total_sessions || 0}</p>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {volunteer?.average_rating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {volunteer?.created_at ? new Date(volunteer.created_at.seconds * 1000).getFullYear() : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VolunteerLayout>
  );
}
