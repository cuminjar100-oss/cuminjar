// Mock data for CuminJar
export const brand = {
  name: 'CuminJar',
  tagline: 'PRESERVE. SHARE. TREASURE.'
};

export const features = [
  {
    id: 'record',
    icon: 'Mic',
    title: 'Record in Their Voice',
    desc: 'Capture voice recipes, stories and traditions exactly the way they tell them.',
    color: 'peach'
  },
  {
    id: 'ai',
    icon: 'Sparkles',
    title: 'AI Transcribes & Organizes',
    desc: 'We turn voice into written recipes with ingredients, steps, timings and more.',
    color: 'sage'
  },
  {
    id: 'memories',
    icon: 'ImagePlus',
    title: 'Add Photos & Memories',
    desc: 'Add photos, notes and memories to make each recipe a beautiful keepsake.',
    color: 'amber'
  },
  {
    id: 'share',
    icon: 'Users',
    title: 'Share with Family',
    desc: 'Invite family members, share recipes and keep traditions alive together.',
    color: 'lavender'
  }
];

export const steps = [
  { n: 1, icon: 'UserPlus', title: 'Create Your Family', desc: 'Set up your family account and invite loved ones in seconds.', tint: 'lavender' },
  { n: 2, icon: 'Mic', title: 'Record & Share', desc: 'Elders record recipes or stories in their own voice using the app.', tint: 'peach' },
  { n: 3, icon: 'Sparkles', title: 'We Work Our Magic', desc: 'AI transcribes, translates (if needed) and structures it into beautiful recipe cards.', tint: 'sage' },
  { n: 4, icon: 'Heart', title: 'Preserve & Cherish', desc: 'Add photos, stories and memories. Share and pass down your heritage.', tint: 'blush' }
];

export const testimonials = [
  {
    id: 't1',
    name: 'Meera R.',
    location: 'Bengaluru, India',
    quote: 'My grandmother\u2019s recipes are more than just cooking \u2014 they\u2019re our family\u2019s memories. CuminJar helped us save her voice forever.',
    avatar: 'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 't2',
    name: 'Arjun K.',
    location: 'San Jose, USA',
    quote: 'Hearing Appa\u2019s voice in the recipe brings me right back home. This app is a blessing for every family.',
    avatar: 'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?w=200&auto=format&fit=crop&q=60'
  },
  {
    id: 't3',
    name: 'Priya S.',
    location: 'Toronto, Canada',
    quote: 'We live in different cities now, but our traditions stay alive. CuminJar keeps our culture close to our kids.',
    avatar: 'https://images.pexels.com/photos/32995728/pexels-photo-32995728.jpeg?w=200&auto=format&fit=crop&q=60'
  }
];

export const pressLogos = ['YourStory', 'Inc42', 'INDIATODAY', 'ThePrint', 'mint', 'THE ECONOMIC TIMES'];

export const sidebarLinks = [
  { key: 'home', label: 'Home', icon: 'Home', path: '/app' },
  { key: 'recipes', label: 'Recipes', icon: 'Soup', path: '/app/recipes' },
  { key: 'stories', label: 'Stories', icon: 'BookOpen', path: '/app/stories' },
  { key: 'voice', label: 'Voice Recipes', icon: 'Mic', path: '/app/voice-recipes' },
  { key: 'albums', label: 'Albums', icon: 'Images', path: '/app/albums' },
  { key: 'tree', label: 'Family Tree', icon: 'Network', path: '/app/family-tree' },
  { key: 'search', label: 'Search', icon: 'Search', path: '/app/search' }
];

export const currentUser = {
  name: 'Meera R.',
  firstName: 'Meera',
  avatar: 'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60'
};

export const familyAvatars = [
  'https://images.pexels.com/photos/32995728/pexels-photo-32995728.jpeg?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1489278353717-f64c6ee8a4d2?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=100&auto=format&fit=crop&q=60'
];

export const mockRecipes = [
  { id: 'r1', title: "Paati's Sambar", author: 'Lakshmi Paati', region: 'South Indian', serves: '4-5', time: '45 mins', tags: ['Lentils', 'Traditional'], cover: 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=800&auto=format&fit=crop&q=60' },
  { id: 'r2', title: "Nani's Rajma Chawal", author: 'Sunita Nani', region: 'North Indian', serves: '4', time: '60 mins', tags: ['Rajma', 'Comfort'], cover: 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=800&auto=format&fit=crop&q=60' },
  { id: 'r3', title: "Amma's Fish Curry", author: 'Rukmini Amma', region: 'Coastal', serves: '3', time: '30 mins', tags: ['Seafood', 'Spicy'], cover: 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=800&auto=format&fit=crop&q=60' },
  { id: 'r4', title: "Dadi's Aloo Paratha", author: 'Kamla Dadi', region: 'Punjabi', serves: '4', time: '40 mins', tags: ['Breakfast'], cover: 'https://images.unsplash.com/photo-1533128361669-69c065857a13?w=800&auto=format&fit=crop&q=60' }
];

export const mockStories = [
  { id: 's1', title: 'The Monsoon Kitchen', author: 'Lakshmi Paati', excerpt: 'The rains would come every June, and our kitchen would fill with the scent of pakoras...', mins: 6 },
  { id: 's2', title: 'Grandma\u2019s Diwali', author: 'Kamla Dadi', excerpt: 'She would begin preparations two weeks before, cleaning the copper pots by hand...', mins: 4 },
  { id: 's3', title: 'The Family Almirah', author: 'Rukmini Amma', excerpt: 'Inside our old wooden almirah lived every festival we ever cooked for...', mins: 5 }
];

export const heroImages = {
  grandmaKitchen: 'https://images.unsplash.com/photo-1522643527310-7222a3f57bb1?w=800&auto=format&fit=crop&q=70',
  heroReference: 'https://customer-assets-eiarnc6j.emergentagent.net/job_fd231760-f3e8-434c-816f-b8c98a910eec/artifacts/ft54uvvl_ChatGPT%20Image%20Jul%2021%2C%202026%2C%2007_34_01%20PM.png',
  dashboardReference: 'https://customer-assets-eiarnc6j.emergentagent.net/job_fd231760-f3e8-434c-816f-b8c98a910eec/artifacts/vc2h89qu_ChatGPT%20Image%20Jul%2022%2C%202026%2C%2012_18_18%20PM.png',
  recipeJournal: 'https://images.pexels.com/photos/34941860/pexels-photo-34941860.jpeg?w=600&auto=format&fit=crop&q=60',
  claypotFrame: 'https://images.pexels.com/photos/35295143/pexels-photo-35295143.jpeg?w=600&auto=format&fit=crop&q=60',
  spicesBowl: 'https://images.unsplash.com/photo-1600728257188-480e132c1610?w=600&auto=format&fit=crop&q=60'
};
