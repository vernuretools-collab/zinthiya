import { Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { CRISIS_HELPLINE } from '../../lib/utils';

export default function SOSButton() {
  const handleEmergencyCall = () => {
    if (typeof window !== 'undefined') {
      // Mobile: initiate call
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `tel:999`;
      } else {
        // Desktop: show modal with numbers
        alert(`Emergency Numbers:\n\n999 - Emergency Services\n${CRISIS_HELPLINE} - Zinthiya Trust Crisis Helpline`);
      }
    }
  };

  return (
    <Button
      onClick={handleEmergencyCall}
      className="fixed top-4 right-4 z-90 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg
                 sm:top-6 sm:right-4 sm:px-4 sm:py-2 sm:text-base
                 md:px-6 md:py-3 md:text-lg
                 px-2 py-0 text-sm
                 flex items-center justify-center"
      size="default"
    >
      <Phone className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2 mr-1.5" />
      <span className="hidden sm:inline">Emergency</span>
      <span className="inline sm:hidden">Emergency</span>
    </Button>
  );
}
  