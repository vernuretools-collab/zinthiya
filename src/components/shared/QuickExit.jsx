import { LogOut } from 'lucide-react';
import { Button } from '../ui/button';

export default function QuickExit() {
  const handleQuickExit = () => {
    // Redirect to neutral site (e.g., weather website)
    window.location.replace('https://www.bbc.co.uk/weather');
  };

  return (
    <Button
      onClick={handleQuickExit}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Quick Exit
    </Button>
  );
}
