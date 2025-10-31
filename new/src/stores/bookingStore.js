import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBookingStore = create(
  persist(
    (set) => ({
      bookingData: {
        support_category: null,
        consultation_type: null,
        volunteer_id: null,
        start_time: null,
        end_time: null,
        victim_name: '',
        victim_email: '',
        victim_phone: '',
        preferred_language: 'en',
        victim_note: '',
        booking_reference: '',
        booking_id: ''
      },
      setBookingData: (data) =>
        set((state) => ({
          bookingData: { ...state.bookingData, ...data }
        })),
      resetBookingData: () =>
        set({
          bookingData: {
            support_category: null,
            consultation_type: null,
            volunteer_id: null,
            start_time: null,
            end_time: null,
            victim_name: '',
            victim_email: '',
            victim_phone: '',
            preferred_language: 'en',
            victim_note: '',
            booking_reference: '',
            booking_id: ''
          }
        })
    }),
    {
      name: 'booking-storage', // localStorage key
      getStorage: () => localStorage // Use localStorage
    }
  )
);
