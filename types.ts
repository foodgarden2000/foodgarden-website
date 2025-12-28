
export interface MenuItem {
  id?: string;
  itemId?: string;
  categoryId: string; // Reference to menuCategories.id
  itemName: string;
  itemType: 'veg' | 'non-veg' | 'snacks' | 'drinks' | 'dessert';
  price: string | number;
  description: string;
  itemImageURL: string; // Google Drive link
  recommended: boolean;
  available: boolean;
  createdAt?: any;
  updatedAt?: any;
  
  // Legacy support for user menu
  name?: string;
  category?: string;
  image?: string;
}

export interface MenuCategory {
  id?: string;
  categoryId?: string;
  categoryName: string;
  description: string;
  backgroundImageURL: string; // Google Drive link
  isActive?: boolean; // For display toggle
  createdAt?: any;
}

export interface CategoryConfig {
  name: string;
  image: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled_by_user' | 'cancelled_by_admin';
export type OrderType = 'delivery' | 'table_booking' | 'cabin_booking' | 'kitty_party' | 'birthday_party' | 'club_meeting';
export type PaymentMode = 'upi' | 'cash' | 'points';
export type UserCategory = 'normal' | 'registered'; // Removed 'subscriber'

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

export interface PointTransaction {
  type: 'earned' | 'spent';
  amount: number;
  via: 'order' | 'referral' | 'signup' | 'bonus';
  date: string;
  orderId?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: 'registered' | 'admin'; // Removed 'subscriber'
  points: number;
  pointsHistory?: PointTransaction[];
  referralCode: string;
  referredBy: string | null; // Stores referralCode of inviter
  totalReferrals: number;
  firstOrderCompleted: boolean;
  createdAt: string;
  // Removed subscription property
}

export interface ReferralReward {
  id?: string;
  userId: string; // Owner of the code
  referredUserId: string; // New user who joined
  pointsEarned: number;
  type: 'signup' | 'first_order';
  timestamp: string;
}

/**
 * Interface for festival special offerings
 */
export interface FestivalSpecial {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  items: string[];
  image: string;
  color: string;
  price?: string;
  available: boolean;
  createdAt?: any;
}

/**
 * Interface for guest reviews
 */
export interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
}

/**
 * Interface for gallery items
 */
export interface GalleryItem {
  image: string;
  caption: string;
}

/**
 * Interface for restaurant contact information
 */
export interface ContactInfo {
  phone: string;
  whatsapp: string;
  address: string;
  facebook?: string;
  instagram?: string;
  email?: string;
  hours?: string;
}
