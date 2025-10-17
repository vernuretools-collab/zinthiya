import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import VolunteerLayout from '../../components/volunteer/VolunteerLayout';
import { Clock, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, '0')}:00`,
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`
}));

export default function VolunteerAvailability() {
  const navigate = useNavigate();
  const [availability, setAvailability] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    day_of_week: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/volunteer/login');
      return;
    }
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    console.log('Fetching availability for user:', auth.currentUser?.uid);
    setLoading(true);
    
    try {
      const userId = auth.currentUser.uid;
      const q = query(
        collection(db, 'volunteer_availability'),
        where('volunteer_id', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      console.log('Found documents:', querySnapshot.size);
      
      const availabilityList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });

      // Sort by day and time
      availabilityList.sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
          return a.day_of_week - b.day_of_week;
        }
        return a.start_time.localeCompare(b.start_time);
      });

      console.log('Final availability list:', availabilityList);
      setAvailability(availabilityList);
    } catch (error) {
      console.error('Error fetching availability:', error);
      alert('Error loading availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time) {
      alert('Please fill in all fields');
      return;
    }

    if (newSlot.start_time >= newSlot.end_time) {
      alert('End time must be after start time');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      
      const docData = {
        volunteer_id: userId,
        day_of_week: parseInt(newSlot.day_of_week),
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        is_recurring: true,
        is_available: true,
        created_at: new Date()
      };
      
      console.log('Adding new slot:', docData);
      
      await addDoc(collection(db, 'volunteer_availability'), docData);

      setShowAddDialog(false);
      setNewSlot({ day_of_week: '', start_time: '', end_time: '' });
      
      // Refresh the list
      await fetchAvailability();
      
      alert('Availability added successfully!');
    } catch (error) {
      console.error('Error adding availability:', error);
      alert('Failed to add availability slot: ' + error.message);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'volunteer_availability', slotId));
      await fetchAvailability();
      alert('Availability slot deleted successfully!');
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete availability slot: ' + error.message);
    }
  };

  const groupByDay = () => {
    const grouped = {};
    availability.forEach(slot => {
      if (!grouped[slot.day_of_week]) {
        grouped[slot.day_of_week] = [];
      }
      grouped[slot.day_of_week].push(slot);
    });
    return grouped;
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

  const groupedAvailability = groupByDay();

  return (
    <VolunteerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Availability</h1>
            <p className="text-gray-600 mt-1">Manage your weekly schedule</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Availability
          </Button>
        </div>

        {/* Debug Info - Remove this after testing */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-3">
            <p className="text-sm">
              <strong>Debug:</strong> Found {availability.length} availability slot(s) 
              {availability.length === 0 && ' - Try adding one using the button above!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Set your regular availability for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availability.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No availability slots added yet</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Slot
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value}>
                    <h3 className="font-semibold text-lg mb-3">{day.label}</h3>
                    {groupedAvailability[day.value] && groupedAvailability[day.value].length > 0 ? (
                      <div className="space-y-2">
                        {groupedAvailability[day.value].map((slot) => (
                          <Card key={slot.id} className="bg-blue-50">
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Clock className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium">
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not available</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-gray-700">
              💡 <strong>Tip:</strong> Clients will only be able to book during your available hours. 
              Make sure to keep your schedule updated for smooth booking experience.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Availability Dialog - BLACK BACKGROUND WITH SCROLLABLE DROPDOWNS */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-black text-white border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Add Availability Slot</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white">Day of Week</Label>
              <Select
                value={newSlot.day_of_week}
                onValueChange={(value) => setNewSlot({ ...newSlot, day_of_week: value })}
              >
                <SelectTrigger className="bg-gray-800 text-white border-gray-600">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-600">
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem 
                      key={day.value} 
                      value={day.value.toString()}
                      className="hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Start Time</Label>
              <Select
                value={newSlot.start_time}
                onValueChange={(value) => setNewSlot({ ...newSlot, start_time: value })}
              >
                <SelectTrigger className="bg-gray-800 text-white border-gray-600">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-600 max-h-60 overflow-y-auto">
                  {TIME_SLOTS.map((time) => (
                    <SelectItem 
                      key={time.value} 
                      value={time.value}
                      className="hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">End Time</Label>
              <Select
                value={newSlot.end_time}
                onValueChange={(value) => setNewSlot({ ...newSlot, end_time: value })}
              >
                <SelectTrigger className="bg-gray-800 text-white border-gray-600">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-600 max-h-60 overflow-y-auto">
                  {TIME_SLOTS.map((time) => (
                    <SelectItem 
                      key={time.value} 
                      value={time.value}
                      className="hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
              className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSlot}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Slot
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VolunteerLayout>
  );
}
