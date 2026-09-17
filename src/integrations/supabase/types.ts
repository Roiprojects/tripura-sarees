export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          active: boolean
          body: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          position: string
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          position?: string
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          position?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          color: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_url: string | null
          description: string | null
          gender: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          section_key: string | null
          slug: string
          sort_order: number
          visible: boolean
        }
        Insert: {
          banner_url?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          section_key?: string | null
          slug: string
          sort_order?: number
          visible?: boolean
        }
        Update: {
          banner_url?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          section_key?: string | null
          slug?: string
          sort_order?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_code: string
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_code: string
          coupon_id: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_code?: string
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applicable_brands: string[]
          applicable_category_ids: string[]
          applicable_product_ids: string[]
          code: string
          coupon_type: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          first_order_only: boolean
          id: string
          max_discount: number | null
          min_order: number
          per_user_limit: number | null
          preorder_only: boolean
          starts_at: string | null
          times_used: number
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          applicable_brands?: string[]
          applicable_category_ids?: string[]
          applicable_product_ids?: string[]
          code: string
          coupon_type?: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          preorder_only?: boolean
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          applicable_brands?: string[]
          applicable_category_ids?: string[]
          applicable_product_ids?: string[]
          code?: string
          coupon_type?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          preorder_only?: boolean
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: []
      }
      courier_details: {
        Row: {
          active: boolean
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          tracking_url_template: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          tracking_url_template?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          tracking_url_template?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      delivery_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: []
      }
      erp_api_logs: {
        Row: {
          api_key_valid: boolean
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          request_time: string
          status_code: number
        }
        Insert: {
          api_key_valid?: boolean
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_time?: string
          status_code: number
        }
        Update: {
          api_key_valid?: boolean
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_time?: string
          status_code?: number
        }
        Relationships: []
      }
      filter_options: {
        Row: {
          active: boolean
          created_at: string
          field: string
          gender: string | null
          id: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          field: string
          gender?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          field?: string
          gender?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      homepage_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          group_key: string | null
          id: string
          image_desktop: string | null
          image_mobile: string | null
          section_id: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          group_key?: string | null
          id?: string
          image_desktop?: string | null
          image_mobile?: string | null
          section_id?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          group_key?: string | null
          id?: string
          image_desktop?: string | null
          image_mobile?: string | null
          section_id?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "homepage_banners_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          bg_color: string | null
          config: Json
          created_at: string
          cta_label: string | null
          cta_url: string | null
          device: string
          id: string
          image_url: string | null
          key: string
          layout: string
          sort_order: number
          subtitle: string | null
          title: string
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          bg_color?: string | null
          config?: Json
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          device?: string
          id?: string
          image_url?: string | null
          key: string
          layout?: string
          sort_order?: number
          subtitle?: string | null
          title: string
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          bg_color?: string | null
          config?: Json
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          device?: string
          id?: string
          image_url?: string | null
          key?: string
          layout?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      homepage_settings: {
        Row: {
          default_cta_color: string | null
          hero_autoplay_ms: number
          id: string
          maintenance_mode: boolean
          mobile_breakpoint: number
          site_title: string | null
          updated_at: string
        }
        Insert: {
          default_cta_color?: string | null
          hero_autoplay_ms?: number
          id?: string
          maintenance_mode?: boolean
          mobile_breakpoint?: number
          site_title?: string | null
          updated_at?: string
        }
        Update: {
          default_cta_color?: string | null
          hero_autoplay_ms?: number
          id?: string
          maintenance_mode?: boolean
          mobile_breakpoint?: number
          site_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nav_links: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          url: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          url: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
          visible?: boolean
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      occasion_tiles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          gradient: string
          icon: string
          id: string
          label: string
          link: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          gradient?: string
          icon?: string
          id?: string
          label: string
          link: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          gradient?: string
          icon?: string
          id?: string
          label?: string
          link?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          color: string
          id: string
          is_preorder: boolean
          order_id: string
          preorder_available_date: string | null
          price: number
          product_id: string | null
          product_image: string | null
          product_name: string | null
          quantity: number
          size: string
          sku: string | null
          status: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          color: string
          id?: string
          is_preorder?: boolean
          order_id: string
          preorder_available_date?: string | null
          price: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          quantity: number
          size: string
          sku?: string | null
          status?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          color?: string
          id?: string
          is_preorder?: boolean
          order_id?: string
          preorder_available_date?: string | null
          price?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          quantity?: number
          size?: string
          sku?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking: {
        Row: {
          courier_name: string | null
          created_at: string
          current_status: string
          delivery_partner_phone: string | null
          dispatch_notes: string | null
          expected_delivery_date: string | null
          id: string
          order_id: string
          tracking_id: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          courier_name?: string | null
          created_at?: string
          current_status?: string
          delivery_partner_phone?: string | null
          dispatch_notes?: string | null
          expected_delivery_date?: string | null
          id?: string
          order_id: string
          tracking_id?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          courier_name?: string | null
          created_at?: string
          current_status?: string
          delivery_partner_phone?: string | null
          dispatch_notes?: string | null
          expected_delivery_date?: string | null
          id?: string
          order_id?: string
          tracking_id?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          assigned_to: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          coupon_code: string | null
          created_at: string
          discount: number
          id: string
          payment_method: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          shipping_address: Json
          status: string
          total: number
          user_id: string
          wallet_amount_used: number
        }
        Insert: {
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          payment_method?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address: Json
          status?: string
          total: number
          user_id: string
          wallet_amount_used?: number
        }
        Update: {
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          payment_method?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address?: Json
          status?: string
          total?: number
          user_id?: string
          wallet_amount_used?: number
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          code: string
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          icon: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      product_color_variants: {
        Row: {
          color_name: string
          created_at: string
          hex_code: string | null
          id: string
          images: string[]
          product_id: string
          sku_code: string | null
          sort_order: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          color_name: string
          created_at?: string
          hex_code?: string | null
          id?: string
          images?: string[]
          product_id: string
          sku_code?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          color_name?: string
          created_at?: string
          hex_code?: string | null
          id?: string
          images?: string[]
          product_id?: string
          sku_code?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          available: boolean
          color_name: string
          created_at: string
          design_id: string | null
          discount_percent: number
          id: string
          product_id: string
          size: string
          sku_code: string | null
          sort_order: number
          stock_quantity: number
          updated_at: string
          variant_price: number | null
        }
        Insert: {
          available?: boolean
          color_name?: string
          created_at?: string
          design_id?: string | null
          discount_percent?: number
          id?: string
          product_id: string
          size: string
          sku_code?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
          variant_price?: number | null
        }
        Update: {
          available?: boolean
          color_name?: string
          created_at?: string
          design_id?: string | null
          discount_percent?: number
          id?: string
          product_id?: string
          size?: string
          sku_code?: string | null
          sort_order?: number
          stock_quantity?: number
          updated_at?: string
          variant_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          age_groups: string[]
          brand: string | null
          care_instructions: string[]
          category_id: string | null
          collection: string | null
          colors: string[]
          compare_at_price: number | null
          country_of_origin: string | null
          created_at: string
          description: string
          design_number: string | null
          disclaimer: string | null
          extra_category_ids: string[]
          gender: string | null
          id: string
          images: string[]
          is_featured: boolean
          is_new: boolean
          is_trending: boolean
          name: string
          preorder_available_date: string | null
          preorder_enabled: boolean
          preorder_message: string | null
          preorder_status: string
          preorder_stock_limit: number | null
          price: number
          rating: number
          review_count: number
          section_keys: string[]
          seo_description: string | null
          seo_title: string | null
          show_on_homepage: boolean
          size_guide_id: string | null
          sizes: string[]
          sku: string | null
          sku_id: string | null
          slug: string | null
          specifications: Json
          status: string
          stock: number
          tags: string[]
        }
        Insert: {
          age_groups?: string[]
          brand?: string | null
          care_instructions?: string[]
          category_id?: string | null
          collection?: string | null
          colors?: string[]
          compare_at_price?: number | null
          country_of_origin?: string | null
          created_at?: string
          description: string
          design_number?: string | null
          disclaimer?: string | null
          extra_category_ids?: string[]
          gender?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          is_new?: boolean
          is_trending?: boolean
          name: string
          preorder_available_date?: string | null
          preorder_enabled?: boolean
          preorder_message?: string | null
          preorder_status?: string
          preorder_stock_limit?: number | null
          price: number
          rating?: number
          review_count?: number
          section_keys?: string[]
          seo_description?: string | null
          seo_title?: string | null
          show_on_homepage?: boolean
          size_guide_id?: string | null
          sizes?: string[]
          sku?: string | null
          sku_id?: string | null
          slug?: string | null
          specifications?: Json
          status?: string
          stock?: number
          tags?: string[]
        }
        Update: {
          age_groups?: string[]
          brand?: string | null
          care_instructions?: string[]
          category_id?: string | null
          collection?: string | null
          colors?: string[]
          compare_at_price?: number | null
          country_of_origin?: string | null
          created_at?: string
          description?: string
          design_number?: string | null
          disclaimer?: string | null
          extra_category_ids?: string[]
          gender?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          is_new?: boolean
          is_trending?: boolean
          name?: string
          preorder_available_date?: string | null
          preorder_enabled?: boolean
          preorder_message?: string | null
          preorder_status?: string
          preorder_stock_limit?: number | null
          price?: number
          rating?: number
          review_count?: number
          section_keys?: string[]
          seo_description?: string | null
          seo_title?: string | null
          show_on_homepage?: boolean
          size_guide_id?: string | null
          sizes?: string[]
          sku?: string | null
          sku_id?: string | null
          slug?: string | null
          specifications?: Json
          status?: string
          stock?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reels_videos: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          status: string
          title: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          title: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          body?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          title?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      section_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          section_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "section_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_categories_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      section_products: {
        Row: {
          created_at: string
          id: string
          pinned: boolean
          product_id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          pinned?: boolean
          product_id: string
          section_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          pinned?: boolean
          product_id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "section_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_by_age: {
        Row: {
          created_at: string
          group_key: string
          id: string
          image_url: string | null
          label: string
          link_url: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          group_key: string
          id?: string
          image_url?: string | null
          label: string
          link_url?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          group_key?: string
          id?: string
          image_url?: string | null
          label?: string
          link_url?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      shop_filter_visibility: {
        Row: {
          created_at: string
          id: string
          label: string
          section_key: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          section_key: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          section_key?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      size_guides: {
        Row: {
          brand: string
          created_at: string
          id: string
          image_url: string | null
          measurements: Json
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          image_url?: string | null
          measurements?: Json
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          image_url?: string | null
          measurements?: Json
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          module: string | null
          target_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          module?: string | null
          target_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          module?: string | null
          target_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string
          id: string
          mobile: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          mobile?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          mobile?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          alt_phone: string | null
          city: string
          country: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          line1: string
          line2: string | null
          phone: string
          pincode: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_phone?: string | null
          city: string
          country?: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1: string
          line2?: string | null
          phone: string
          pincode: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_phone?: string | null
          city?: string
          country?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1?: string
          line2?: string | null
          phone?: string
          pincode?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_consultation_slots: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      video_consultations: {
        Row: {
          category: string | null
          created_at: string
          customer_name: string
          id: string
          notes: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          status: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_name: string
          id?: string
          notes?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          status?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          notes?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_refund_requests: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          fee: number
          gross: number
          id: string
          order_id: string
          order_item_id: string | null
          payment_method: string | null
          reason: string | null
          refund_amount: number
          status: string
          updated_at: string
          user_id: string
          wallet_transaction_id: string | null
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fee?: number
          gross?: number
          id?: string
          order_id: string
          order_item_id?: string | null
          payment_method?: string | null
          reason?: string | null
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id: string
          wallet_transaction_id?: string | null
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fee?: number
          gross?: number
          id?: string
          order_id?: string
          order_item_id?: string | null
          payment_method?: string | null
          reason?: string | null
          refund_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_refund_requests_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          source: string
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source: string
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source?: string
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_no: number
          created_at: string
          duration_ms: number | null
          error: string | null
          event_id: string
          http_status: number | null
          id: string
          response_body: string | null
        }
        Insert: {
          attempt_no: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event_id: string
          http_status?: number | null
          id?: string
          response_body?: string | null
        }
        Update: {
          attempt_no?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          event_id?: string
          http_status?: number | null
          id?: string
          response_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string
          attempts: number
          created_at: string
          event_type: string
          event_version: string
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type?: string
          attempts?: number
          created_at?: string
          event_type: string
          event_version?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string
          attempts?: number
          created_at?: string
          event_type?: string
          event_version?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: {
          p_amount: number
          p_note?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      approve_wallet_refund: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      cancel_order_item_with_refund: {
        Args: { p_item_id: string; p_reason?: string }
        Returns: Json
      }
      cancel_order_with_refund: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: Json
      }
      claim_webhook_events: {
        Args: { p_limit?: number }
        Returns: {
          aggregate_id: string | null
          aggregate_type: string
          attempts: number
          created_at: string
          event_type: string
          event_version: string
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          sent_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      debit_wallet_for_order: {
        Args: { p_amount: number; p_order_id: string }
        Returns: Json
      }
      decrement_stock_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      emit_webhook_event: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type?: string
          p_event_type: string
          p_idempotency_key?: string
          p_payload: Json
        }
        Returns: string
      }
      get_or_create_wallet: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_coupon_use: {
        Args: { p_code: string; p_discount: number; p_order_id: string }
        Returns: undefined
      }
      reject_wallet_refund: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      restore_stock_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      subscribe_newsletter: {
        Args: { p_email: string; p_source?: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      validate_coupon_v2: {
        Args: { p_code: string; p_subtotal?: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
