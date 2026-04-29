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
      name: 'booking-storage',
      // ✅ Serialize Date → ISO string, Deserialize ISO string → Date
      serialize: (state) => JSON.stringify({
        ...state,
        state: {
          ...state.state,
          bookingData: {
            ...state.state.bookingData,
            start_time: state.state.bookingData.start_time instanceof Date
              ? state.state.bookingData.start_time.toISOString()
              : state.state.bookingData.start_time,
            end_time: state.state.bookingData.end_time instanceof Date
              ? state.state.bookingData.end_time.toISOString()
              : state.state.bookingData.end_time,
          }
        }
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        const bd = parsed.state?.bookingData;
        if (bd?.start_time) bd.start_time = new Date(bd.start_time);
        if (bd?.end_time) bd.end_time = new Date(bd.end_time);
        return parsed;
      }
    }
  )
);
