export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      cached_articles: {
        Row: {
          cached_at: string | null;
          html_content: string | null;
          id: string;
          plain_text: string | null;
          reader_document_id: string;
          reader_updated_at: string | null;
          user_id: string | null;
          word_count: number | null;
        };
        Insert: {
          cached_at?: string | null;
          html_content?: string | null;
          id?: string;
          plain_text?: string | null;
          reader_document_id: string;
          reader_updated_at?: string | null;
          user_id?: string | null;
          word_count?: number | null;
        };
        Update: {
          cached_at?: string | null;
          html_content?: string | null;
          id?: string;
          plain_text?: string | null;
          reader_document_id?: string;
          reader_updated_at?: string | null;
          user_id?: string | null;
          word_count?: number | null;
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
      cached_documents: {
        Row: {
          author: string | null;
          cached_at: string | null;
          category: string;
          first_opened_at: string | null;
          id: string;
          image_url: string | null;
          last_opened_at: string | null;
          location: string | null;
          published_date: string | null;
          reader_created_at: string | null;
          reader_document_id: string;
          reader_last_moved_at: string | null;
          reader_saved_at: string | null;
          reader_updated_at: string | null;
          reading_progress: number | null;
          site_name: string | null;
          source: string | null;
          source_url: string | null;
          summary: string | null;
          tags: Json | null;
          title: string | null;
          url: string;
          user_id: string;
          word_count: number | null;
        };
        Insert: {
          author?: string | null;
          cached_at?: string | null;
          category: string;
          first_opened_at?: string | null;
          id?: string;
          image_url?: string | null;
          last_opened_at?: string | null;
          location?: string | null;
          published_date?: string | null;
          reader_created_at?: string | null;
          reader_document_id: string;
          reader_last_moved_at?: string | null;
          reader_saved_at?: string | null;
          reader_updated_at?: string | null;
          reading_progress?: number | null;
          site_name?: string | null;
          source?: string | null;
          source_url?: string | null;
          summary?: string | null;
          tags?: Json | null;
          title?: string | null;
          url: string;
          user_id: string;
          word_count?: number | null;
        };
        Update: {
          author?: string | null;
          cached_at?: string | null;
          category?: string;
          first_opened_at?: string | null;
          id?: string;
          image_url?: string | null;
          last_opened_at?: string | null;
          location?: string | null;
          published_date?: string | null;
          reader_created_at?: string | null;
          reader_document_id?: string;
          reader_last_moved_at?: string | null;
          reader_saved_at?: string | null;
          reader_updated_at?: string | null;
          reading_progress?: number | null;
          site_name?: string | null;
          source?: string | null;
          source_url?: string | null;
          summary?: string | null;
          tags?: Json | null;
          title?: string | null;
          url?: string;
          user_id?: string;
          word_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cached_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_conversations: {
        Row: {
          article_title: string;
          created_at: string | null;
          id: string;
          reader_document_id: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          article_title: string;
          created_at?: string | null;
          id?: string;
          reader_document_id: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          article_title?: string;
          created_at?: string | null;
          id?: string;
          reader_document_id?: string;
          updated_at?: string | null;
          user_id?: string | null;
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
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          role: string;
        };
        Insert: {
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role: string;
        };
        Update: {
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: string;
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
      reading_sessions: {
        Row: {
          article_title: string;
          article_url: string | null;
          completion_percentage: number | null;
          created_at: string | null;
          ended_at: string | null;
          id: string;
          mode: string | null;
          rating: number | null;
          reader_document_id: string;
          started_at: string | null;
          total_words: number;
          user_id: string | null;
          words_read: number | null;
          wpm_end: number | null;
          wpm_start: number;
        };
        Insert: {
          article_title: string;
          article_url?: string | null;
          completion_percentage?: number | null;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          mode?: string | null;
          rating?: number | null;
          reader_document_id: string;
          started_at?: string | null;
          total_words: number;
          user_id?: string | null;
          words_read?: number | null;
          wpm_end?: number | null;
          wpm_start: number;
        };
        Update: {
          article_title?: string;
          article_url?: string | null;
          completion_percentage?: number | null;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          mode?: string | null;
          rating?: number | null;
          reader_document_id?: string;
          started_at?: string | null;
          total_words?: number;
          user_id?: string | null;
          words_read?: number | null;
          wpm_end?: number | null;
          wpm_start?: number;
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
      readwise_sync_state: {
        Row: {
          archive_cursor: string | null;
          feed_cursor: string | null;
          in_progress: boolean | null;
          inbox_cursor: string | null;
          initial_backfill_done: boolean | null;
          last_429_at: string | null;
          last_sync_at: string | null;
          library_cursor: string | null;
          lock_acquired_at: string | null;
          next_allowed_at: string | null;
          shortlist_cursor: string | null;
          user_id: string;
          window_request_count: number | null;
          window_started_at: string | null;
        };
        Insert: {
          archive_cursor?: string | null;
          feed_cursor?: string | null;
          in_progress?: boolean | null;
          inbox_cursor?: string | null;
          initial_backfill_done?: boolean | null;
          last_429_at?: string | null;
          last_sync_at?: string | null;
          library_cursor?: string | null;
          lock_acquired_at?: string | null;
          next_allowed_at?: string | null;
          shortlist_cursor?: string | null;
          user_id: string;
          window_request_count?: number | null;
          window_started_at?: string | null;
        };
        Update: {
          archive_cursor?: string | null;
          feed_cursor?: string | null;
          in_progress?: boolean | null;
          inbox_cursor?: string | null;
          initial_backfill_done?: boolean | null;
          last_429_at?: string | null;
          last_sync_at?: string | null;
          library_cursor?: string | null;
          lock_acquired_at?: string | null;
          next_allowed_at?: string | null;
          shortlist_cursor?: string | null;
          user_id?: string;
          window_request_count?: number | null;
          window_started_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'readwise_sync_state_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          default_wpm: number | null;
          email: string;
          font_size: string | null;
          id: string;
          llm_api_key: string | null;
          llm_api_key_encrypted: string | null;
          llm_provider: string | null;
          reader_access_token: string | null;
          reader_access_token_encrypted: string | null;
          rsvp_font: string | null;
          skip_amount: number | null;
          theme: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_wpm?: number | null;
          email: string;
          font_size?: string | null;
          id: string;
          llm_api_key?: string | null;
          llm_api_key_encrypted?: string | null;
          llm_provider?: string | null;
          reader_access_token?: string | null;
          reader_access_token_encrypted?: string | null;
          rsvp_font?: string | null;
          skip_amount?: number | null;
          theme?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_wpm?: number | null;
          email?: string;
          font_size?: string | null;
          id?: string;
          llm_api_key?: string | null;
          llm_api_key_encrypted?: string | null;
          llm_provider?: string | null;
          reader_access_token?: string | null;
          reader_access_token_encrypted?: string | null;
          rsvp_font?: string | null;
          skip_amount?: number | null;
          theme?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
