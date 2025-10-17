import { z } from 'zod';

export const bookingFormSchema = z.object({
  victim_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  
  victim_email: z.string()
    .email('Please enter a valid email address'),
  
  victim_phone: z.string()
    .regex(/^(\+44|0)[0-9]{10}$/, 'Please enter a valid UK phone number'),
  
  preferred_language: z.enum(['en', 'hi', 'gu', 'pu', 'pl']),
  
  victim_note: z.string()
    .max(200, 'Note must be less than 200 characters')
    .optional(),
  
  support_category: z.enum([
    'domestic_abuse',
    'debt_advice',
    'poverty_welfare',
    'general_counselling'
  ]),
  
  consultation_type: z.enum(['phone', 'in_person']),
  
  volunteer_id: z.string().min(1, 'Please select a volunteer'),
  
  start_time: z.date(),
  
  end_time: z.date()
});

export const volunteerRegistrationSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  
  email: z.string().email('Please enter a valid email address'),
  
  phone: z.string()
    .regex(/^(\+44|0)[0-9]{10}$/, 'Please enter a valid UK phone number')
    .optional(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirm_password: z.string(),
  
  bio: z.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(200, 'Bio must be less than 200 characters'),
  
  support_categories: z.array(z.string()).min(1, 'Select at least one category'),
  
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine(data => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});
