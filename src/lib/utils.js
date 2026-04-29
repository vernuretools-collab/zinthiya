import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  MdSecurity,           // Domestic Abuse - Protection
  MdAccountBalanceWallet, // Money Advice - Finance  
  MdVolunteerActivism,   // Emergency Support - Helping hand
  MdCalculate           // Debt Advice - Calculator
} from 'react-icons/md';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('44')) {
    return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return `+44•••${cleaned.slice(-4)}`;
  }
  return phone;
}

export function generateBookingReference() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ZT-${year}-${random}`;
}

export const SUPPORT_CATEGORIES = {
  domestic_abuse: {
    label: 'Domestic Abuse Support',
    icon: MdSecurity,
    description: 'Safe, confidential support for those experiencing domestic abuse',
    color: 'bg-red-100 text-red-800'
  },
  money_advice: {
    label: 'Money Advice & Welfare',
    icon: MdAccountBalanceWallet,
    description: 'Free guidance to manage debt and improve financial wellbeing',
    color: 'bg-green-100 text-green-800'
  },
  
  debt_advice: {
    label: 'Debt Advice',
    icon: MdCalculate,
    description: 'Expert help with debt management, budgeting, and relief options',
    color: 'bg-purple-100 text-purple-800'
  },
  emergency_support: {
    label: 'Others',
    icon: MdVolunteerActivism,
    description: 'Urgent aid for energy bills, food parcels, and essentials',
    color: 'bg-blue-100 text-blue-800'
  },
};

export const LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧' },
  hi: { label: 'Hindi', flag: '🇮🇳' },
  gu: { label: 'Gujarati', flag: '🇮🇳' },
  pu: { label: 'Punjabi', flag: '🇮🇳' },
  pl: { label: 'Polish', flag: '🇵🇱' }
};

export const CRISIS_HELPLINE = '0116 254 5168';
export const OFFICE_ADDRESS = '12 Bishop Street, Leicester LE1 6AF';
export const BOOKINGS_EMAIL = 'bookings@zinthiyatrust.org';
