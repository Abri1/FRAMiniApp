// Define the database schema structure for type safety
export interface DatabaseSchema {
  users: {
    id: string;
    telegram_id: string;
    credits: number;
    phone_number: string;
    created_at: string;
    username?: string;
  };
  alerts: {
    id: string;
    user_id: string;
    pair: string;
    target_price: number;
    direction: 'above' | 'below' | null;
    active: boolean;
    created_at: string;
    notification_sent?: boolean;
    retry_count?: number;
    last_failure_reason?: string | null;
  };
}

// This can be used with Supabase type generation if needed
// export type Database = DatabaseSchema; 