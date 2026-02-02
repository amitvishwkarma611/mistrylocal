
import React from 'react';
import { 
  Hammer, Drill, PenTool, Ruler, Lock, Home, Settings, Scissors, Box, Coffee, 
  Armchair, Layout, Trash2, Sofa, DoorOpen, HardHat, Disc, UtilityPole, 
  Layers, Package, ChevronRight, Pen, Paintbrush, MoveRight, HelpCircle,
  Trees, Brush, Sparkles
} from 'lucide-react';
import { Service, Carpenter } from './types';

// Removed calculateDistance - no longer needed with area-based matching

export const MOCK_CARPENTERS: Carpenter[] = [
  {
    id: 'c1',
    name: 'Demo Carpenter',
    phone: '9876543210',
    rating: 4.9,
    ratingCount: 120,
    jobsCompleted: 142,
    verified: true,
    distance: '0.4 km',
    specialties: ['Locks', 'Hinges', 'Small Repairs'],
    acceptsSmallJobs: true,
    image: 'https://picsum.photos/seed/carp3/200/200',
    lat: 28.4590,
    lng: 77.0260,
    trustScore: 92,
    recentTags: ['Clean work', 'Polite']
  }
];

export const SERVICES: Service[] = [
  // Door & Lock (MOST FREQUENT)
  { id: 'door-noise', title: 'Door noise fix', titleHindi: 'दरवाज़े का शोर', titlePunjabi: 'ਦਰਵਾਜ਼ੇ ਦਾ ਸ਼ੋਰ', description: 'Squeaking fix', icon: 'DoorOpen', basePrice: 400, category: 'repair' },
  { id: 'door-align', title: 'Door loose alignment', titleHindi: 'दरवाजा अलाइनमेंट', titlePunjabi: 'ਦਰਵਾਜ਼ਾ ਅਲਾਈਨਮੈਂਟ', description: 'Fixing gaps/dragging', icon: 'Ruler', basePrice: 450, category: 'repair' },
  { id: 'lock-fit', title: 'Lock fitting/replacement', titleHindi: 'ताला लगाना', titlePunjabi: 'ਤਾਲਾ ਲਗਾਉਣਾ', description: 'New or repair', icon: 'Lock', basePrice: 550, category: 'fitting' },
  { id: 'handle-loose', title: 'Handle loose/change', titleHindi: 'हैंडल ढीला/बदलें', titlePunjabi: 'ਹੈਂਡਲ ਢਿੱਲਾ/ਬਦਲੋ', description: 'Quick fix', icon: 'PenTool', basePrice: 400, category: 'fitting' },
  { id: 'door-stopper', title: 'Door stopper fitting', titleHindi: 'डोर स्टॉपर फिटिंग', titlePunjabi: 'ਡੋਰ ਸਟੌਪਰ ਫਿਟਿੰਗ', description: 'Floor/Wall mount', icon: 'Settings', basePrice: 400, category: 'fitting' },
  { id: 'sliding-repair', title: 'Sliding door repair', titleHindi: 'स्लाइडिंग डोर मरम्मत', titlePunjabi: 'ਸਲਾਈਡਿੰਗ ਡੋਰ ਮੁਰੰਮਤ', description: 'Track cleaning/fix', icon: 'Layout', basePrice: 600, category: 'repair' },
  { id: 'bathroom-door', title: 'Bathroom door swelling', titleHindi: 'बाथरूम का दरवाजा', titlePunjabi: 'ਬਾਥਰੂਮ ਦਾ ਦਰਵਾਜ਼ਾ', description: 'Sanding/Fitting', icon: 'Scissors', basePrice: 450, category: 'repair' },

  // Hinges & Fittings
  { id: 'hinge-replace', title: 'Hinge replacement', titleHindi: 'कब्जा बदलना', titlePunjabi: 'ਕਬਜ਼ਾ ਬਦਲਣਾ', description: 'New hinges', icon: 'Settings', basePrice: 400, category: 'fitting' },
  { id: 'hinge-tighten', title: 'Loose hinge tighten', titleHindi: 'कब्जा कसना', titlePunjabi: 'ਕਬਜ਼ਾ ਕੱਸਣਾ', description: 'Screw fix', icon: 'Drill', basePrice: 400, category: 'repair' },
  { id: 'screw-replace', title: 'Screw replacement', titleHindi: 'पेंच बदलना', titlePunjabi: 'ਪੇਚ ਬਦਲਣਾ', description: 'Small fix', icon: 'Drill', basePrice: 400, category: 'repair' },
  { id: 'broken-screw', title: 'Broken screw removal', titleHindi: 'टूटा हुआ पेंच', titlePunjabi: 'ਟੁੱਟਿਆ ਹੋਇਆ ਪੇਚ', description: 'Expert extraction', icon: 'Hammer', basePrice: 450, category: 'repair' },
  { id: 'door-closer', title: 'Door closer fitting', titleHindi: 'डोर क्लोजर फिटिंग', titlePunjabi: 'ਡੋਰ ਕਲੋਜ਼ਰ ਫਿਟਿੰਗ', description: 'Automatic closer', icon: 'Package', basePrice: 550, category: 'fitting' },

  // Drawer & Wardrobe
  { id: 'drawer-stuck', title: 'Drawer stuck/jammed', titleHindi: 'दराज जाम', titlePunjabi: 'ਦਰਾਜ਼ ਜਾਮ', description: 'Fixing tracks', icon: 'Box', basePrice: 400, category: 'repair' },
  { id: 'drawer-runner', title: 'Drawer runner change', titleHindi: 'दराज चैनल बदलना', titlePunjabi: 'ਦਰਾਜ਼ ਚੈਨਲ ਬਦਲਣਾ', description: 'Telescopic/Normal', icon: 'MoveRight', basePrice: 500, category: 'repair' },
  { id: 'cupboard-lock', title: 'Cupboard lock fitting', titleHindi: 'अलमारी का ताला', titlePunjabi: 'ਅਲਮਾਰੀ ਦਾ ਤਾਲਾ', description: 'Key/Safe fix', icon: 'Lock', basePrice: 450, category: 'fitting' },
  { id: 'wardrobe-handle', title: 'Wardrobe handle change', titleHindi: 'वॉर्डरोब हैंडल', titlePunjabi: 'ਵਾਰਡਰੋਬ ਹੈਂਡਲ', description: 'Styling update', icon: 'PenTool', basePrice: 400, category: 'fitting' },
  { id: 'shelf-support', title: 'Shelf support repair', titleHindi: 'शेल्फ सपोर्ट', titlePunjabi: 'ਸ਼ੈਲਫ ਸਪੋਰਟ', description: 'Reinforcing', icon: 'Layers', basePrice: 400, category: 'repair' },

  // Furniture Noise
  { id: 'bed-noise', title: 'Bed noise fixing', titleHindi: 'बिस्तर का शोर', titlePunjabi: 'ਬਿਸਤਰੇ ਦਾ ਸ਼ੋਰ', description: 'Squeak removal', icon: 'Sofa', basePrice: 550, category: 'repair' },
  { id: 'storage-bed', title: 'Storage bed alignment', titleHindi: 'स्टोरेज बेड अलाइनमेंट', titlePunjabi: 'ਸਟੋਰੇਜ ਬੈੱਡ ਅਲਾਈਨਮੈਂਟ', description: 'Lifting mechanism', icon: 'Box', basePrice: 650, category: 'repair' },
  { id: 'chair-wobble', title: 'Chair wobble fix', titleHindi: 'कुर्सी डगमगाना', titlePunjabi: 'ਕੁਰਸੀ ਡਗਮਗਾਉਣਾ', description: 'Joint glue/tighten', icon: 'Disc', basePrice: 400, category: 'repair' },
  { id: 'table-balance', title: 'Table balance fix', titleHindi: 'मेज़ का बैलेंस', titlePunjabi: 'ਮੇਜ਼ ਦਾ ਸੰਤੁਲਨ', description: 'Uneven legs', icon: 'Ruler', basePrice: 400, category: 'repair' },

  // Wall & Curtain
  { id: 'curtain-rod', title: 'Curtain rod fitting', titleHindi: 'पर्दा रॉड फिटिंग', titlePunjabi: 'ਪਰਦਾ ਰੌਡ ਫਿਟਿੰਗ', description: 'Full installation', icon: 'Ruler', basePrice: 400, category: 'fitting' },
  { id: 'blinds-fitting', title: 'Blinds fitting', titleHindi: 'ब्लाइंड्स फिटिंग', titlePunjabi: 'ਬਲਾਇੰਡਸ ਫਿਟਿੰਗ', description: 'Office/Home', icon: 'Layers', basePrice: 500, category: 'fitting' },
  { id: 'wall-drilling', title: 'Wall drilling (Light)', titleHindi: 'दीवार ड्रिलिंग', titlePunjabi: 'ਕੰਧ ਡ੍ਰਿਲਿੰਗ', description: 'Frames/Mounts', icon: 'Drill', basePrice: 400, category: 'fitting' },

  // Kitchen
  { id: 'kitchen-hinge', title: 'Kitchen cabinet hinge', titleHindi: 'किचन कैबिनेट कब्जा', titlePunjabi: 'ਰਸੋਈ ਕੈਬਨਿਟ ਕਬਜ਼ਾ', description: 'Auto-close fix', icon: 'Settings', basePrice: 400, category: 'repair' },
  { id: 'trolley-drawer', title: 'Trolley drawer fix', titleHindi: 'ट्रॉली दराज', titlePunjabi: 'ਟਰਾਲ਼ੀ ਦਰਾਜ਼', description: 'Modular kitchen', icon: 'Layout', basePrice: 550, category: 'repair' },

  // Finish & Polish
  { id: 'minor-polish', title: 'Minor polish touch-up', titleHindi: 'पॉलिश टच-अप', titlePunjabi: 'ਪਾਲਿਸ਼ ਟੱਚ-ਅੱਪ', description: 'Restore shine', icon: 'Paintbrush', basePrice: 600, category: 'custom' },
  { id: 'laminate-corner', title: 'Laminate corner fix', titleHindi: 'लैमिनेट कोना', titlePunjabi: 'ਲੈਮੀਨੇਟ ਕੋਨਾ', description: 'Peeling edges', icon: 'Pen', basePrice: 400, category: 'repair' },

  // Installation
  { id: 'mag-catcher', title: 'Magnetic catcher fix', titleHindi: 'मैग्नेटिक कैचर', titlePunjabi: 'ਮੈਗਨੈਟਿਕ ਕੈਚਰ', description: 'Cabinet door hold', icon: 'Package', basePrice: 400, category: 'fitting' },

  // Cleaning
  { id: 'garden-clean', title: 'Garden cleaning', titleHindi: 'बगीचे की सफाई', titlePunjabi: 'ਬਗੀਚੇ ਦੀ ਸਫਾਈ', description: 'Yard debris & pruning', icon: 'Trees', basePrice: 650, category: 'cleaning' },
  { id: 'room-clean', title: 'Room deep clean', titleHindi: 'कमरे की सफाई', titlePunjabi: 'ਕੰਮਰੇ ਦੀ ਸਫਾਈ', description: 'Post-work dust removal', icon: 'Brush', basePrice: 550, category: 'cleaning' },
  { id: 'park-clean', title: 'Park cleaning', titleHindi: 'पार्क की सफाई', titlePunjabi: 'ਪਾਰਕ की ਸਫਾਈ', description: 'Litter & grass maintenance', icon: 'Trees', basePrice: 850, category: 'cleaning' },
  { id: 'school-ground-clean', title: 'School ground cleaning', titleHindi: 'स्कूल ग्राउंड सफाई', titlePunjabi: 'ਸਕੂਲ ਗਰਾਊਂਡ ਸਫਾਈ', description: 'Large campus cleanup', icon: 'Sparkles', basePrice: 1200, category: 'cleaning' },

  // Miscellaneous
  { id: 'shoe-rack', title: 'Wooden shoe rack fix', titleHindi: 'जूता रैक मरम्मत', titlePunjabi: 'ਜੁੱਤੀ ਰੈਕ ਮੁਰੰਮਤ', description: 'Loose doors/shelves', icon: 'Package', basePrice: 400, category: 'repair' },
  { id: 'pooja-unit', title: 'Pooja unit small fix', titleHindi: 'पूजा यूनिट मरम्मत', titlePunjabi: 'ਪੂਜਾ ਯੂਨਿਟ ਮੁਰੰਮਤ', description: 'Detailed care', icon: 'Home', basePrice: 450, category: 'repair' }
];

export const CATEGORIES = [
  { id: 'repair', name: 'Repair & Fix', emoji: '🔧', nameHindi: 'मरम्मत और ठीक करना', namePunjabi: 'ਮੁਰੰਮਤ ਅਤੇ ਠੀਕ ਕਰਨਾ' },
  { id: 'fitting', name: 'Fitting & Install', emoji: '🧰', nameHindi: 'फिटिंग और इंस्टाल', namePunjabi: 'ਫਿਟਿੰਗ ਅਤੇ ਇੰਸਟਾਲ' },
  { id: 'custom', name: 'Polish & Finish', emoji: '✨', nameHindi: 'पॉलिश और फिनिश', namePunjabi: 'ਪਾਲਿਸ਼ ਅਤੇ ਫਿਨਿਸ਼' },
  { id: 'cleaning', name: 'Cleaning Services', emoji: '🧹', nameHindi: 'सफाई सेवाएँ', namePunjabi: 'ਸਫਾਈ ਸੇਵਾਵਾਂ' }
];

export const getIcon = (name: string, className?: string) => {
  const icons: Record<string, any> = {
    Hammer, Drill, DoorOpen, Lock, Settings, Box, Sofa, Layout, 
    PenTool, Ruler, Scissors, Paintbrush, Pen, Package, Layers, 
    Disc, MoveRight, Home, Trees, Brush, Sparkles
  };
  const IconComponent = icons[name] || HelpCircle;
  return <IconComponent className={className} />;
};
