export type MessageType = "text" | "image" | "file" | "video" | "audio";
export type MessageStatus = "sent" | "delivered" | "read";

export type ChatFile = {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  storage_service: string | null;
  uploaded_at: string;
};

export type ChatReaction = {
  user_id: string;
  emoji: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  reply_to_id: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  files: ChatFile[];
  reactions: ChatReaction[];
  status: MessageStatus;
  // Client-only fields for optimistic sends — never present on rows
  // that came back from the server.
  _pending?: boolean;
  _failed?: boolean;
  _localId?: string;
};

export type ChatContact = {
  id: string;
  name: string;
  email: string;
  profile_pic_url: string | null;
  department: string | null;
  designation: string | null;
  conversation_id: string | null;
  last_message: string | null;
  last_message_type: MessageType | null;
  last_message_at: string | null;
  unread_count: number;
};

export type ConversationResponse = {
  conversation_id: string;
  other_user: {
    id: string;
    name: string;
    email: string;
    role: string;
    workspace_id: string | null;
    profile_pic_url: string | null;
    last_seen_at: string | null;
  };
  messages: ChatMessage[];
  has_more: boolean;
};

export type PendingAttachment = {
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
};