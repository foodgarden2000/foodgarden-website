
import { MenuItem, FestivalSpecial, Review, GalleryItem } from './types';

export const RESTAURANT_INFO = {
  name: "Chef’s Jalsa",
  tagline: "Test Your Taste",
  phone: "+91 8809477481",
  address: "Subhash Chowk, Near PWD, Jhumri Telaiya, Koderma, Jharkhand",
  hours: "11:00 AM – 10:00 PM",
  whatsapp: "918809477481",
  mapLink: "https://www.google.com/maps/search/Chef's+Jalsa+Jhumri+Telaiya"
};

/**
 * Converts a Google Drive share link into a direct image URL.
 */
export const getOptimizedImageURL = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const idMatch = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$|id=(.*?)(&|$)/);
    const id = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : null;
    if (id) {
      return `https://lh3.googleusercontent.com/d/${id}=w1000`;
    }
  }
  return url;
};

export const CONTACT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBunHvnj5tByv_Y0qHHAMfYMST13AX-ZiyuFDCOvVq_Rlu7fvHXwJbET-ATlRDbLuFfdTrA73spf2J/pub?output=csv";
export const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ195lwvvNXb9o2tih3WwQ0dcP1TXS32y3Me3LQDk-7n04NudBVr7ntZJ5Qw9uJDQadC_C2dOumd2fw/pub?gid=0&single=true&output=csv";
export const MENU_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3MPgLp_uX9GXVawk8dlMzF_oa89ZIqNd3dRVclePFYIfbduVVDsg_lCgcrH22e4LKipMBYEMXGys7/pub?gid=829806034&single=true&output=csv";
export const GALLERY_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtsUESvi28kqcXY11bB6H5AMnwvnuDfSwuULkfDHyisVEimTn7Da9jkcUaATfmGUfcpWfjmgp13Bz/pub?gid=0&single=true&output=csv";

export const SERVICES_DATA: Record<string, string[]> = {
  "Special Offerings": ["Vegan Options Available", "Veg Options Available"],
  "Dining Options": ["Dinner", "Lunch"],
  "Serves": ["Coffee", "Desserts"],
  "Services": ["Takeaway Available", "Home Delivery"],
  "Amenities": ["Drive-Through"],
  "Crowd": ["Group Friendly"]
};

// Fixed MENU_ITEMS to satisfy the MenuItem interface requirements
export const MENU_ITEMS: MenuItem[] = [
  { itemName: "Veg Noodles", description: "Stir-fried noodles with fresh vegetables and aromatic sauces.", categoryId: "Chinese", itemType: "veg", price: "₹120", itemImageURL: "", recommended: false, available: true },
  { itemName: "Manchurian", description: "Vegetable balls tossed in spicy and tangy soya sauce.", categoryId: "Chinese", itemType: "veg", price: "₹140", itemImageURL: "", recommended: false, available: true },
  { itemName: "Veg Burger", description: "Crispy patty with fresh lettuce, tomato, and house special dressing.", categoryId: "Snacks", itemType: "snacks", price: "₹80", itemImageURL: "", recommended: false, available: true },
  { itemName: "Pizza Pocket", description: "Golden fried pockets stuffed with cheese and pizza veggies.", categoryId: "Snacks", itemType: "snacks", price: "₹90", itemImageURL: "", recommended: false, available: true },
  { itemName: "French Fries", description: "Classic salted crispy potato fries.", categoryId: "Snacks", itemType: "snacks", price: "₹70", itemImageURL: "", recommended: false, available: true },
  { itemName: "Potali Samosa", description: "Unique potali-shaped samosas with rich spicy filling.", categoryId: "Snacks", itemType: "snacks", price: "₹40", itemImageURL: "", recommended: false, available: true },
  { itemName: "Soup of the Day", description: "Chef's special fresh vegetable soup.", categoryId: "Chinese", itemType: "veg", price: "₹90", itemImageURL: "", recommended: false, available: true },
  { itemName: "Paneer Butter Masala", description: "Cottage cheese cubes in rich tomato and cashew gravy.", categoryId: "Indian", itemType: "veg", price: "₹220", itemImageURL: "", recommended: false, available: true },
  { itemName: "Dal Tadka", description: "Yellow lentils tempered with ghee, cumin, and garlic.", categoryId: "Indian", itemType: "veg", price: "₹160", itemImageURL: "", recommended: false, available: true },
  { itemName: "Butter Naan", description: "Soft tandoori bread topped with butter.", categoryId: "Indian", itemType: "veg", price: "₹45", itemImageURL: "", recommended: false, available: true },
  { itemName: "Gulab Jamun & Ice-Cream", description: "Hot gulab jamun paired with vanilla ice cream.", categoryId: "Desserts", itemType: "dessert", price: "₹90", itemImageURL: "", recommended: false, available: true },
  { itemName: "Sizzling Brownie", description: "Walnut brownie with chocolate sauce on a hot plate.", categoryId: "Desserts", itemType: "dessert", price: "₹150", itemImageURL: "", recommended: false, available: true },
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
