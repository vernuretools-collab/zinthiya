import { create } from 'zustand';

export const useBookingStore = create((set) => ({
  bookingData: {
    support_category: '',
    volunteer_id: '',
    start_time: null,
    end_time: null,
    consultation_type: '',
    victim_name: '',
    victim_email: '',
    victim_phone: '',
    preferred_language: 'en',
    victim_note: ''
  },
  
  setBookingData: (data) => set((state) => ({
    bookingData: { ...state.bookingData, ...data }
  })),
  
  resetBookingData: () => set({
    bookingData: {
      support_category: '',
      volunteer_id: '',
      start_time: null,
      end_time: null,
      consultation_type: '',
      victim_name: '',
      victim_email: '',
      victim_phone: '',
      preferred_language: 'en',
      victim_note: ''
    }
  })
}));
