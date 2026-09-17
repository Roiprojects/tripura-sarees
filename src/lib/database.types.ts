export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  parent_id?: string | null;
  sort_order?: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  sizes: string[];
  colors: string[];
  images: string[];
  stock: number;
  rating: number;
  created_at: string;
  category?: Category;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  size: string;
  color: string;
  created_at: string;
  product?: Product;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  total: number;
  shipping_address: ShippingAddress;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
  sku?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  product?: Product;
};


export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};
