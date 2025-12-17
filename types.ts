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

export interface FestivalSpecial {
  title: string;
  subtitle: string;
  description: string;
  items: string[];
  image: string;
  color: string;
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