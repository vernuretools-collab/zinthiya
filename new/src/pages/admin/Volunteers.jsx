import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Users, 
  UserCheck, 
  UserX,
  Loader2,
  Shield,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updating, setUpdating] = useState(null); // Track which volunteer is being updated

  useEffect(() => {
    fetchVolunteers();
  }, []);

  useEffect(() => {
    filterVolunteersList();
  }, [volunteers, searchTerm, filterStatus]);

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'volunteers'));
      const volunteersList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      console.log('Fetched volunteers:', volunteersList.length);
      setVolunteers(volunteersList);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      alert('Failed to fetch volunteers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterVolunteersList = () => {
    let filtered = [...volunteers];

    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterStatus) {
      case 'verified':
        filtered = filtered.filter(v => v.is_verified === true);
        break;
      case 'unverified':
        filtered = filtered.filter(v => v.is_verified === false);
        break;
      case 'active':
        filtered = filtered.filter(v => v.is_active === true);
        break;
      case 'inactive':
        filtered = filtered.filter(v => v.is_active === false);
        break;
      default:
        break;
    }

    setFilteredVolunteers(filtered);
  };

  const toggleVerified = async (id, current, volunteerName) => {
    const action = current ? 'unverify' : 'verify';
    if (!confirm(`Are you sure you want to ${action} ${volunteerName}?`)) {
      return;
    }

    setUpdating(id);
    console.log(`Attempting to ${action} volunteer:`, { id, current });

    try {
      const volunteerRef = doc(db, 'volunteers', id);
      const updateData = { 
        is_verified: !current,
        updated_at: new Date()
      };
      
      console.log('Updating with data:', updateData);
      
      await updateDoc(volunteerRef, updateData);
      
      // Update local state
      setVolunteers(vs => vs.map(v => 
        v.id === id ? { ...v, is_verified: !current, updated_at: new Date() } : v
      ));
      
      console.log('Update successful');
      alert(`Volunteer ${action === 'verify' ? 'verified' : 'unverified'} successfully!`);
    } catch (error) {
      console.error('Error updating verified status:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // More detailed error messages
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check your Firestore security rules for admin access.');
      } else if (error.code === 'not-found') {
        alert('Volunteer not found in database.');
      } else {
        alert('Failed to update verification status: ' + error.message);
      }
    } finally {
      setUpdating(null);
    }
  };

  const toggleActive = async (id, current, volunteerName) => {
    const action = current ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${volunteerName}?`)) {
      return;
    }

    setUpdating(id);
    console.log(`Attempting to ${action} volunteer:`, { id, current });

    try {
      const volunteerRef = doc(db, 'volunteers', id);
      const updateData = { 
        is_active: !current,
        updated_at: new Date()
      };
      
      console.log('Updating with data:', updateData);
      
      await updateDoc(volunteerRef, updateData);
      
      // Update local state
      setVolunteers(vs => vs.map(v => 
        v.id === id ? { ...v, is_active: !current, updated_at: new Date() } : v
      ));
      
      console.log('Update successful');
      alert(`Volunteer ${action}d successfully!`);
    } catch (error) {
      console.error('Error updating active status:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // More detailed error messages
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please check your Firestore security rules for admin access.');
      } else if (error.code === 'not-found') {
        alert('Volunteer not found in database.');
      } else {
        alert('Failed to update active status: ' + error.message);
      }
    } finally {
      setUpdating(null);
    }
  };

  const getStats = () => {
    const total = volunteers.length;
    const verified = volunteers.filter(v => v.is_verified).length;
    const active = volunteers.filter(v => v.is_active).length;
    const pending = volunteers.filter(v => !v.is_verified).length;
    
    return { total, verified, active, pending };
  };

  const stats = getStats();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm sm:text-base text-gray-600">Loading volunteers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            Manage Volunteers
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Review and manage volunteer applications and status
          </p>
        </div>

       

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Volunteers</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 sm:p-5"> 
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Verified</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                    {stats.verified}
                  </p>
                </div>
                <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Active</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
                    {stats.active}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
                    {stats.pending}
                  </p>
                </div>
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'verified', label: 'Verified' },
                  { key: 'unverified', label: 'Unverified' },
                  { key: 'active', label: 'Active' },
                  { key: 'inactive', label: 'Inactive' }
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={filterStatus === filter.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(filter.key)}
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volunteers Table/Cards */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              {filteredVolunteers.length} Volunteer{filteredVolunteers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredVolunteers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No volunteers found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-y">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-700">Email</th>
                        <th className="p-4 text-center text-sm font-semibold text-gray-700">Verified</th>
                        <th className="p-4 text-center text-sm font-semibold text-gray-700">Active</th>
                        <th className="p-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVolunteers.map((v) => (
                        <tr key={v.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-gray-900">{v.full_name || 'No Name'}</p>
                              <p className="text-xs text-gray-500">{v.phone || 'No phone'}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700 break-all">{v.email}</p>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="checkbox"
                                checked={v.is_verified}
                                onChange={() => toggleVerified(v.id, v.is_verified, v.full_name)}
                                disabled={updating === v.id}
                                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              {v.is_verified ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                              {updating === v.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={() => toggleActive(v.id, v.is_active, v.full_name)}
                                disabled={updating === v.id}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              {v.is_active ? (
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                              {updating === v.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant={v.is_verified ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleVerified(v.id, v.is_verified, v.full_name)}
                                disabled={updating === v.id}
                                className="text-xs"
                              >
                                {updating === v.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  v.is_verified ? 'Unverify' : 'Verify'
                                )}
                              </Button>
                              <Button
                                variant={v.is_active ? "destructive" : "default"}
                                size="sm"
                                onClick={() => toggleActive(v.id, v.is_active, v.full_name)}
                                disabled={updating === v.id}
                                className="text-xs"
                              >
                                {updating === v.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  v.is_active ? 'Deactivate' : 'Activate'
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 p-3 sm:p-4">
                  {filteredVolunteers.map((v) => (
                    <Card key={v.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-base text-gray-900">
                              {v.full_name || 'No Name'}
                            </p>
                            <p className="text-sm text-gray-600 break-all">{v.email}</p>
                            {v.phone && (
                              <p className="text-xs text-gray-500 mt-1">{v.phone}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant={v.is_verified ? "default" : "secondary"} className="text-xs">
                              {v.is_verified ? '✓ Verified' : '✗ Unverified'}
                            </Badge>
                            <Badge variant={v.is_active ? "default" : "secondary"} className="text-xs">
                              {v.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {updating === v.id && (
                              <Badge variant="outline" className="text-xs">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Updating...
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={v.is_verified}
                                onChange={() => toggleVerified(v.id, v.is_verified, v.full_name)}
                                disabled={updating === v.id}
                                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50"
                              />
                              <span className="text-xs sm:text-sm text-gray-600">Verified</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={() => toggleActive(v.id, v.is_active, v.full_name)}
                                disabled={updating === v.id}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                              />
                              <span className="text-xs sm:text-sm text-gray-600">Active</span>
                            </label>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant={v.is_verified ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleVerified(v.id, v.is_verified, v.full_name)}
                              disabled={updating === v.id}
                              className="flex-1 text-xs sm:text-sm h-9"
                            >
                              {updating === v.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                v.is_verified ? 'Unverify' : 'Verify'
                              )}
                            </Button>
                            <Button
                              variant={v.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleActive(v.id, v.is_active, v.full_name)}
                              disabled={updating === v.id}
                              className="flex-1 text-xs sm:text-sm h-9"
                            >
                              {updating === v.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                v.is_active ? 'Deactivate' : 'Activate'
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
