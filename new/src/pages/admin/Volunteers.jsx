import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVolunteers() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'volunteers'));
        setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching volunteers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVolunteers();
  }, []);

  const toggleVerified = async (id, current) => {
    try {
      await updateDoc(doc(db, 'volunteers', id), { is_verified: !current });
      setVolunteers(vs => vs.map(v => (v.id === id ? { ...v, is_verified: !current } : v)));
    } catch (error) {
      console.error('Error updating verified status:', error);
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await updateDoc(doc(db, 'volunteers', id), { is_active: !current });
      setVolunteers(vs => vs.map(v => (v.id === id ? { ...v, is_active: !current } : v)));
    } catch (error) {
      console.error('Error updating active status:', error);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Volunteers</h1>
      {loading ? (
        <p>Loading volunteers...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Verified</th>
                <th className="p-3 text-center">Active</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id} className="border-t border-gray-200">
                  <td className="p-3">{v.full_name || 'No Name'}</td>
                  <td className="p-3">{v.email}</td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={v.is_verified}
                      onChange={() => toggleVerified(v.id, v.is_verified)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={v.is_active}
                      onChange={() => toggleActive(v.id, v.is_active)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Deactivate volunteer ${v.full_name}?`)) {
                          await toggleActive(v.id, true);
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
