
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

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled_by_user' | 'cancelled_by_admin';
export type OrderType = 'delivery' | 'table_booking' | 'cabin_booking';

export interface Order {
  id?: string;
  userId: string | null;
  userName: string;
  userPhone: string;
  address: string;
  itemName: string;
  orderType: OrderType;
  orderAmount: number;
  quantity: number;
  status: OrderStatus;
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
    status: 'active' | 'rejected' | 'pending';
    plan: string;
    startDate: string;
    txnId?: string;
  };
}

export interface SubscriptionRequest {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planName: string;
  amount: string;
  txnId: string;
  status: 'pending' | 'active' | 'rejected';
  createdAt: string;
  activatedAt?: string;
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
