
export interface MenuItem {
  name: string;
  description: string;
  price?: string;
  category: string;
  isVegetarian?: boolean;
  image?: string;
  categoryBackgroundImage?: string;
  itemBackgroundImage?: string;
}

export interface CategoryConfig {
  name: string;
  image: string;
}

export interface Order {
  id?: string;
  userId: string | null; // null for guest
  userName: string;
  userPhone: string;
  address: string;
  itemName: string;
  orderAmount: number;
  quantity: number;
  status: 'pending' | 'delivered' | 'cancelled';
  pointsEarned: number;
  pointsCredited: boolean;
  createdAt: string;
  deliveredAt?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: 'registered' | 'subscriber' | 'admin';
  points: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
}

export interface Referral {
  id?: string;
  referrerId: string;
  newUserId: string;
  referralType: 'register' | 'subscribe';
  pointsGiven: number;
  createdAt: string;
}

export interface FestivalSpecial {
  title: string;
  subtitle: string;
  description: string;
  items: string[];
  image: string;
  color?: string;
  price?: string;
}

export interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
}

export interface GalleryItem {
  image: string;
  caption?: string;
}

export interface ContactInfo {
  phone: string;
  whatsapp: string;
  address: string;
  facebook: string;
  instagram: string;
  email: string;
  hours: string;
}
