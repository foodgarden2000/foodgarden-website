
export interface MenuItem {
  // Legacy Fields (kept for backward compatibility)
  name: string;
  description: string;
  price?: string;
  category: string;
  isVegetarian?: boolean;
  image?: string;
  categoryBackgroundImage?: string;
  itemBackgroundImage?: string;

  // New Management Fields
  itemName?: string;
  priceNum?: number;
  categoryType?: string; // e.g., Veg, Non-Veg, Jain, Special
  backgroundImageUrl?: string; // Google Drive link
  isAvailable?: boolean;
  isRecommended?: boolean;
  isNewItem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuCategory {
  id?: string;
  categoryName: string;
  categoryImageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryConfig {
  name: string;
  image: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled_by_user' | 'cancelled_by_admin';
export type OrderType = 'delivery' | 'table_booking' | 'cabin_booking' | 'kitty_party' | 'birthday_party' | 'club_meeting';
export type PaymentMode = 'upi' | 'cash' | 'points';
export type UserCategory = 'normal' | 'registered' | 'subscriber';

export interface Order {
  id?: string;
  userId: string | null;
  userType: UserCategory;
  guestCancelToken?: string;
  userName: string;
  userPhone: string;
  address: string;
  itemName: string;
  orderType: OrderType;
  orderAmount: number;
  quantity: number;
  status: OrderStatus;
  paymentMode: PaymentMode;
  pointsUsed: number;
  amountEquivalent: number;
  pointsDeducted: boolean;
  pointsEarned: number;
  pointsCredited: boolean;
  createdAt: string;
  deliveredAt?: string;
  updatedAt?: string;
  notes?: string;
  rejectReason?: string;
  cancelReason?: string;
  cancelledBy?: 'user' | 'admin';
}

export interface EventBooking {
  id?: string;
  bookingType: 'kitty' | 'birthday' | 'club';
  userId: string;
  userName: string;
  phone: string;
  date: string;
  time: string;
  peopleCount: number;
  specialNote: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled_by_user';
  adminReason?: string;
  createdAt: string;
  updatedAt: string;
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
  subscription?: {
    status: 'active' | 'rejected' | 'pending' | 'expired';
    plan: 'yearly' | 'lifetime';
    startDate: string;
    expiryDate?: string;
    isExpired?: boolean;
    transactionId?: string;
  };
}

export interface SubscriptionRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  transactionId: string;
  planType: 'yearly' | 'lifetime';
  amountPaid: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  adminReason?: string;
  expiryDate?: string | null;
  isExpired?: boolean;
  createdAt: string;
  updatedAt: string;
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
