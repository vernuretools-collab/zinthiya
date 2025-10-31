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
      <style>{`
        @keyframes slideDownAndFade {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpAndFade {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
        [data-state="open"] { animation: slideDownAndFade 0.3s ease-out; }
        [data-state="closed"] { animation: slideUpAndFade 0.2s ease-in; }
        [data-radix-select-item] { transition: all 0.15s ease-in-out; }
      `}</style>

      <div className="space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl md:text-3xl font-bold text-gray-900">
              My Availability
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Manage your weekly schedule
            </p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Availability
          </Button>
        </div>

        {/* Debug Info */}
        <Card className="bg-yellow-50 border-yellow-200 border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm">
              <strong>Debug:</strong> Found {availability.length} availability slot(s) 
              {availability.length === 0 && ' - Try adding one using the button above!'}
            </p>
          </CardContent>
        </Card>

        {/* Weekly Schedule Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Weekly Schedule
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Set your regular availability for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {availability.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
                  No availability slots added yet
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="text-sm sm:text-base h-10 sm:h-11"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Slot
                </Button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value}>
                    <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-2 sm:mb-3 text-gray-900">
                      {day.label}
                    </h3>
                    {groupedAvailability[day.value] && groupedAvailability[day.value].length > 0 ? (
                      <div className="space-y-2">
                        {groupedAvailability[day.value].map((slot) => (
                          <Card key={slot.id} className="bg-blue-50 border-blue-100 shadow-sm">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium text-sm sm:text-base text-gray-900">
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-500 italic pl-1">
                        Not available
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tip Card */}
        <Card className="bg-blue-50 border-blue-200 border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              💡 <strong>Tip:</strong> Clients will only be able to book during your available hours. 
              Make sure to keep your schedule updated for smooth booking experience.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Availability Dialog - Responsive */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white text-black border border-gray-300 max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-black text-lg sm:text-xl md:text-2xl pr-8">
              Add Availability Slot
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5 py-4">
            {/* Day of Week */}
            <div>
              <Label className="text-black text-sm sm:text-base mb-2 block font-semibold">
                Day of Week
              </Label>
              <div className="border border-gray-300 rounded-md">
                <Select 
                  value={newSlot.day_of_week}
                  onValueChange={(value) => setNewSlot({ ...newSlot, day_of_week: value })}
                >
                  <SelectTrigger className="bg-white text-black focus:ring-0 focus:ring-offset-0 h-11 sm:h-12 text-sm sm:text-base">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black z-[100]">
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem 
                        key={day.value} 
                        value={day.value.toString()}
                        className="text-black bg-white hover:bg-gray-100 focus:bg-gray-100 focus:text-black cursor-pointer text-sm sm:text-base"
                      >
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Time */}
            <div>
              <Label className="text-black text-sm sm:text-base mb-2 block font-semibold">
                Start Time
              </Label>
              <div className="border border-gray-300 rounded-md">
                <Select
                  value={newSlot.start_time}
                  onValueChange={(value) => setNewSlot({ ...newSlot, start_time: value })}
                >
                  <SelectTrigger className="bg-white text-black focus:ring-0 focus:ring-offset-0 h-11 sm:h-12 text-sm sm:text-base">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black max-h-60 overflow-y-auto z-[100]">
                    {TIME_SLOTS.map((time) => (
                      <SelectItem 
                        key={time.value} 
                        value={time.value}
                        className="text-black bg-white hover:bg-gray-100 focus:bg-gray-100 focus:text-black cursor-pointer text-sm sm:text-base"
                      >
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End Time */}
            <div>
              <Label className="text-black text-sm sm:text-base mb-2 block font-semibold">
                End Time
              </Label>
              <div className="border border-gray-300 rounded-md">
                <Select
                  value={newSlot.end_time}
                  onValueChange={(value) => setNewSlot({ ...newSlot, end_time: value })}
                >
                  <SelectTrigger className="bg-white text-black focus:ring-0 focus:ring-offset-0 h-11 sm:h-12 text-sm sm:text-base">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black max-h-60 overflow-y-auto z-[100]">
                    {TIME_SLOTS.map((time) => (
                      <SelectItem 
                        key={time.value} 
                        value={time.value}
                        className="text-black bg-white hover:bg-gray-100 focus:bg-gray-100 focus:text-black cursor-pointer text-sm sm:text-base"
                      >
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
              className="w-full sm:w-auto bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 hover:text-gray-900 h-10 sm:h-11 text-sm sm:text-base order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSlot}
              className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 h-10 sm:h-11 text-sm sm:text-base order-1 sm:order-2"
            >
              Add Slot
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VolunteerLayout>
  );
}
