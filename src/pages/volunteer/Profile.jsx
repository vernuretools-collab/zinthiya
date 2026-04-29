import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { updatePassword } from 'firebase/auth';
import { auth, db, storage } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import { SUPPORT_CATEGORIES, LANGUAGES } from '../../lib/utils';
import { User, Lock, Save, Loader2, Image as ImageIcon, Camera, Upload, Trash2 } from 'lucide-react';

export default function VolunteerProfile() {
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef(null);

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
        setImagePreview(data.profile_image_url || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfileImage = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const userId = auth.currentUser.uid;
      const storageRef = ref(storage, `volunteers/${userId}/profile.jpg`);
      
      // Upload image
      await uploadBytes(storageRef, imageFile);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setImageFile(null);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    if (window.confirm('Are you sure you want to remove your profile image?')) {
      setRemoveImage(true);
      setImagePreview(null);
      setImageFile(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userId = auth.currentUser.uid;
      let imageUrl = volunteer?.profile_image_url;
      
      // Handle image upload
      if (imageFile) {
        imageUrl = await uploadProfileImage();
      }
      
      // Handle image removal
      if (removeImage || !imageUrl) {
        imageUrl = '';
      }
      
      await updateDoc(doc(db, 'volunteers', userId), {
        ...editedData,
        profile_image_url: imageUrl,
        updated_at: new Date()
      });
      
      setVolunteer(prev => ({ 
        ...prev, 
        ...editedData, 
        profile_image_url: imageUrl 
      }));
      setEditing(false);
      setImagePreview(imageUrl);
      setImageFile(null);
      setRemoveImage(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
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

  const handleEditClick = () => {
    setEditing(true);
    setImagePreview(volunteer?.profile_image_url || null);
    setRemoveImage(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setImagePreview(volunteer?.profile_image_url || null);
    setImageFile(null);
    setRemoveImage(false);
    setEditedData({
      full_name: volunteer?.full_name || '',
      phone: volunteer?.phone || '',
      bio: volunteer?.bio || '',
      support_categories: volunteer?.support_categories || [],
      languages: volunteer?.languages || []
    });
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
              onClick={handleEditClick}
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
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-blue-100">
                  <AvatarImage 
                    src={editing ? imagePreview : volunteer?.profile_image_url} 
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                    {volunteer?.full_name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                {/* Image Actions - Edit Mode Only */}
                {editing && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-white p-2 rounded-full shadow-lg ring-2 ring-gray-200">
                    <label className="cursor-pointer p-1 hover:bg-gray-50 rounded-full transition-colors">
                      <Camera className="h-4 w-4 text-blue-600" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer hidden"
                      />
                    </label>
                    {imagePreview && !imageFile && !removeImage && (
                      <button
                        onClick={removeProfileImage}
                        className="p-1 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Upload Progress */}
                {(uploadingImage || saving) && (
                  <div className="absolute -top-2 right-0 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-md">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {editing ? editedData.full_name : volunteer?.full_name}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 break-all">
                  {auth.currentUser?.email}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge 
                    variant={volunteer?.is_verified ? 'default' : 'secondary'}
                    className="text-xs px-2 py-1"
                  >
                    {volunteer?.is_verified ? '✓ Verified' : 'Pending Verification'}
                  </Badge>
                  <Badge 
                    variant={volunteer?.is_active ? 'default' : 'secondary'}
                    className="text-xs px-2 py-1"
                  >
                    {volunteer?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Editing Form or View Mode */}
            {editing ? (
              <div className="space-y-4 sm:space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold">
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    value={editedData.full_name}
                    onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                    className="h-11 text-base"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    className="h-11 text-base"
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-semibold">
                    Bio (Max 200 chars)
                  </Label>
                  <Textarea
                    id="bio"
                    value={editedData.bio}
                    onChange={(e) => setEditedData({ ...editedData, bio: e.target.value })}
                    maxLength={200}
                    className="min-h-[100px] text-base"
                    placeholder="Tell us about yourself and your expertise..."
                  />
                  <p className="text-xs text-gray-500 text-right">
                    {editedData.bio.length}/200 characters
                  </p>
                </div>

                {/* Support Categories */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold block">
                    Support Categories *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(SUPPORT_CATEGORIES).map(([key, category]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleArrayItem('support_categories', key)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md
                          ${editedData.support_categories.includes(key)
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg ${category.iconColor || 'text-blue-500'}`}>
                            {category.icon}
                          </span>
                          <span className="font-medium text-sm">{category.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold block">
                    Languages
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(LANGUAGES).map(([code, lang]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArrayItem('languages', code)}
                        className={`
                          px-4 py-2.5 rounded-full border-2 transition-all duration-200 font-medium text-sm
                          ${editedData.languages.includes(code)
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
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
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving || uploadingImage}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving || uploadingImage || !editedData.full_name || editedData.support_categories.length === 0}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    {saving || uploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadingImage ? 'Uploading Image...' : 'Saving...'}
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Phone</Label>
                    <p className="text-base text-gray-900 font-medium">
                      {volunteer?.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Bio</Label>
                    <p className="text-base text-gray-700 leading-relaxed max-w-2xl">
                      {volunteer?.bio || 'No bio provided.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                      Support Categories
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {volunteer?.support_categories?.map((cat) => (
                        <Badge 
                          key={cat} 
                          className={`${SUPPORT_CATEGORIES[cat]?.color} text-xs px-3 py-1 font-medium`}
                        >
                          {SUPPORT_CATEGORIES[cat]?.icon} {SUPPORT_CATEGORIES[cat]?.label}
                        </Badge>
                      )) || <p className="text-sm text-gray-500 italic">No categories selected</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Languages</Label>
                    <div className="flex flex-wrap gap-2">
                      {volunteer?.languages?.map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs px-3 py-1">
                          {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
                        </Badge>
                      )) || <p className="text-sm text-gray-500 italic">No languages selected</p>}
                    </div>
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
            <div className="space-y-3">
              <Label htmlFor="newPassword" className="text-sm font-semibold">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 8 characters"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="h-11 text-base"
              />
            </div>
            <Button 
              onClick={handleChangePassword}
              disabled={!passwordData.newPassword || passwordData.newPassword.length < 8}
              className="w-full sm:w-auto h-11 text-base font-semibold"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                <p className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {volunteer?.total_sessions || 0}
                </p>
                <p className="text-sm font-medium text-gray-700">Total Sessions</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
                <p className="text-3xl lg:text-4xl font-bold text-green-600 mb-2">
                  {volunteer?.average_rating ? volunteer.average_rating.toFixed(1) : '0.0'}
                </p>
                <p className="text-sm font-medium text-gray-700">Average Rating</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl">
                <p className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">
                  {volunteer?.created_at 
                    ? new Date(volunteer.created_at.seconds * 1000).getFullYear() 
                    : 'N/A'}
                </p>
                <p className="text-sm font-medium text-gray-700">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VolunteerLayout>
  );
}