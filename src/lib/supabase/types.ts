export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          reader_access_token: string | null;
          llm_provider: string | null;
          llm_api_key: string | null;
          default_wpm: number;
          theme: string;
          font_size: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          reader_access_token?: string | null;
          llm_provider?: string | null;
          llm_api_key?: string | null;
          default_wpm?: number;
          theme?: string;
          font_size?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          reader_access_token?: string | null;
          llm_provider?: string | null;
          llm_api_key?: string | null;
          default_wpm?: number;
          theme?: string;
          font_size?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          reader_document_id: string;
          article_title: string;
          article_url: string | null;
          started_at: string;
          ended_at: string | null;
          wpm_start: number;
          wpm_end: number | null;
          words_read: number;
          total_words: number;
          completion_percentage: number;
          mode: string;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reader_document_id: string;
          article_title: string;
          article_url?: string | null;
          started_at?: string;
          ended_at?: string | null;
          wpm_start: number;
          wpm_end?: number | null;
          words_read?: number;
          total_words: number;
          completion_percentage?: number;
          mode?: string;
          rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reader_document_id?: string;
          article_title?: string;
          article_url?: string | null;
          started_at?: string;
          ended_at?: string | null;
          wpm_start?: number;
          wpm_end?: number | null;
          words_read?: number;
          total_words?: number;
          completion_percentage?: number;
          mode?: string;
          rating?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          reader_document_id: string;
          article_title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reader_document_id: string;
          article_title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reader_document_id?: string;
          article_title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_conversations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'chat_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      cached_articles: {
        Row: {
          id: string;
          user_id: string;
          reader_document_id: string;
          html_content: string | null;
          plain_text: string | null;
          word_count: number | null;
          cached_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reader_document_id: string;
          html_content?: string | null;
          plain_text?: string | null;
          word_count?: number | null;
          cached_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reader_document_id?: string;
          html_content?: string | null;
          plain_text?: string | null;
          word_count?: number | null;
          cached_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cached_articles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
