import { MenuItem, FestivalSpecial, Review, GalleryItem } from './types';

export const RESTAURANT_INFO = {
  name: "Chef’s Jalsa",
  tagline: "Test Your Taste",
  phone: "+91 8809477481",
  address: "Subhash Chowk, Near PWD, Jhumri Telaiya, Koderma, Jharkhand",
  hours: "11:00 AM – 10:00 PM",
  whatsapp: "918809477481", // Updated WhatsApp number
  mapLink: "https://www.google.com/maps/search/Chef's+Jalsa+Jhumri+Telaiya"
};

// URL for Dynamic Contact Information (Google Sheet)
// Columns: Phone | WhatsApp | Address | Facebook | Instagram | Email | Hours
export const CONTACT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBunHvnj5tByv_Y0qHHAMfYMST13AX-ZiyuFDCOvVq_Rlu7fvHXwJbET-ATlRDbLuFfdTrA73spf2J/pub?output=csv";

export const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ195lwvvNXb9o2tih3WwQ0dcP1TXS32y3Me3LQDk-7n04NudBVr7ntZJ5Qw9uJDQadC_C2dOumd2fw/pub?gid=0&single=true&output=csv";

// Converted the user's published HTML link to a CSV export link for easier parsing
export const MENU_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3MPgLp_uX9GXVawk8dlMzF_oa89ZIqNd3dRVclePFYIfbduVVDsg_lCgcrH22e4LKipMBYEMXGys7/pub?gid=829806034&single=true&output=csv";

// URL for Gallery Images (Google Sheet Method)
// ---------------------------------------------------------
// GUIDE: How to add images from ANY Google Drive Account/Folder:
// 1. Log into ANY Google Drive account (it doesn't have to be the main one).
// 2. Right-click the image -> Share -> General Access: "Anyone with the link" -> Copy Link.
// 3. Paste that link into the 'Image' column of the Google Sheet below.
// 4. The website handles the rest automatically.
// ---------------------------------------------------------
export const GALLERY_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtsUESvi28kqcXY11bB6H5AMnwvnuDfSwuULkfDHyisVEimTn7Da9jkcUaATfmGUfcpWfjmgp13Bz/pub?gid=0&single=true&output=csv";

export const SERVICES_DATA: Record<string, string[]> = {
  "Special Offerings": ["Vegan Options Available", "Veg Options Available"],
  "Dining Options": ["Dinner", "Lunch"],
  "Serves": ["Coffee", "Desserts"],
  "Services": ["Takeaway Available", "Home Delivery"],
  "Amenities": ["Drive-Through"],
  "Crowd": ["Group Friendly"]
};

export const MENU_ITEMS: MenuItem[] = [
  // Fallback data in case sheet fetch fails
  { name: "Veg Noodles", description: "Stir-fried noodles with fresh vegetables and aromatic sauces.", category: "Chinese", isVegetarian: true, price: "₹120" },
  { name: "Manchurian", description: "Vegetable balls tossed in spicy and tangy soya sauce.", category: "Chinese", isVegetarian: true, price: "₹140" },
  { name: "Veg Burger", description: "Crispy patty with fresh lettuce, tomato, and house special dressing.", category: "Snacks", isVegetarian: true, price: "₹80" },
  { name: "Pizza Pocket", description: "Golden fried pockets stuffed with cheese and pizza veggies.", category: "Snacks", isVegetarian: true, price: "₹90" },
  { name: "French Fries", description: "Classic salted crispy potato fries.", category: "Snacks", isVegetarian: true, price: "₹70" },
  { name: "Potali Samosa", description: "Unique potali-shaped samosas with rich spicy filling.", category: "Snacks", isVegetarian: true, price: "₹40" },
  { name: "Soup of the Day", description: "Chef's special fresh vegetable soup.", category: "Chinese", isVegetarian: true, price: "₹90" },
  { name: "Paneer Butter Masala", description: "Cottage cheese cubes in rich tomato and cashew gravy.", category: "Indian", isVegetarian: true, price: "₹220" },
  { name: "Dal Tadka", description: "Yellow lentils tempered with ghee, cumin, and garlic.", category: "Indian", isVegetarian: true, price: "₹160" },
  { name: "Butter Naan", description: "Soft tandoori bread topped with butter.", category: "Indian", isVegetarian: true, price: "₹45" },
  { name: "Gulab Jamun & Ice-Cream", description: "Hot gulab jamun paired with vanilla ice cream.", category: "Desserts", isVegetarian: true, price: "₹90" },
  { name: "Sizzling Brownie", description: "Walnut brownie with chocolate sauce on a hot plate.", category: "Desserts", isVegetarian: true, price: "₹150" },
];

export const FESTIVAL_SPECIALS: FestivalSpecial[] = [
  {
    title: "Sankranti Delights",
    subtitle: "A Harvest Feast",
    description: "Celebrate the harvest with our grand platter featuring 30 traditional dishes.",
    items: ["Til Kut", "Dahi Chura", "Khichdi Platter", "Special Sweets"],
    image: "https://picsum.photos/600/400?random=10",
    color: "bg-orange-50"
  },
  {
    title: "Valentine’s Day",
    subtitle: "Romantic Dining",
    description: "An intimate candle-light dinner experience for couples with live music.",
    items: ["Heart-shaped Cutlets", "Red Velvet Dessert", "Rose Mocktail"],
    image: "https://picsum.photos/600/400?random=11",
    color: "bg-pink-50"
  },
  {
    title: "Saraswati Puja & Republic Day",
    subtitle: "Double Celebration Combo",
    description: "Pure vegetarian feast honoring tradition and patriotism.",
    items: ["Yellow Rice", "Tricolor Salad", "Boondi Ladoo"],
    image: "https://picsum.photos/600/400?random=12",
    color: "bg-yellow-50"
  }
];

export const REVIEWS: Review[] = [
  { id: 1, name: "Amit Kumar", rating: 5, comment: "Best family restaurant in Koderma! The Potali Samosa is a must-try." },
  { id: 2, name: "Sneha Gupta", rating: 5, comment: "Beautiful ambiance and very polite staff. Loved the Valentine's decoration." },
  { id: 3, name: "Rajeev Verma", rating: 4, comment: "Great place for birthday parties in Jhumri Telaiya. Good food quality." },
];