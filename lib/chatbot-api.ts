import api from './api';

export const CHATBOT_MESSAGE_V2 = '/mobcash/v2/chatbot/message/';
export const CHATBOT_HUMAN_MESSAGES_V2 = '/mobcash/v2/chatbot/human-messages/';
export const CHATBOT_MARK_READ_V2 = '/mobcash/v2/chatbot/mark-read/';
export const UPLOAD_FILE = '/mobcash/upload/file';

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.turaincash.com';

export async function sendChatbotMessage(payload: {
  message: string;
  conversation_id?: string | null;
  page_key?: string;
  route?: string;
  screen_title?: string;
}) {
  // Défaut axios ~20s ; l'IA peut prendre 1-2 min
  const res = await api.post(CHATBOT_MESSAGE_V2, payload, { timeout: 120_000 });
  return res.data as {
    conversation_id?: string;
    message?: string;
    detail?: string;
    escalated?: boolean;
    silent?: boolean;
    images?: Array<{ url?: string; caption?: string }>;
  };
}

export async function sendChatbotAudio(
  file: File,
  payload: {
    conversation_id?: string | null;
    page_key?: string;
    route?: string;
    screen_title?: string;
  }
) {
  const form = new FormData();
  form.append('audio', file);
  if (payload.conversation_id) form.append('conversation_id', payload.conversation_id);
  if (payload.page_key) form.append('page_key', payload.page_key);
  if (payload.route) form.append('route', payload.route);
  if (payload.screen_title) form.append('screen_title', payload.screen_title);
  const res = await api.post(CHATBOT_MESSAGE_V2, form, {
    timeout: 120_000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as {
    conversation_id?: string;
    message?: string;
    detail?: string;
    escalated?: boolean;
    silent?: boolean;
    user_media_type?: string | null;
    user_media_url?: string | null;
  };
}

export type ChatbotHumanMessage = {
  id: string;
  conversation_id: string;
  content: string;
  media_type?: string;
  media_url?: string;
  file_name?: string;
  created_at: string;
};

/** Réponses d'un conseiller humain — récupérées via polling. */
export async function fetchChatbotHumanMessages(
  conversationId: string,
  after?: string | null
): Promise<ChatbotHumanMessage[]> {
  const res = await api.get(CHATBOT_HUMAN_MESSAGES_V2, {
    params: { conversation_id: conversationId, ...(after ? { after } : {}) },
    timeout: 15_000,
  });
  const data = res.data as { messages?: ChatbotHumanMessage[] };
  return Array.isArray(data.messages) ? data.messages : [];
}

/** Upload image → URL publique consommée par le chatbot. */

/** Accusé de lecture client → ticks « lu » côté app agent. */
export async function markChatbotRead(conversationId: string): Promise<{
  agent_last_read_at?: string | null;
  customer_last_read_at?: string | null;
}> {
  const cid = (conversationId || '').trim();
  if (!cid) return {};
  const res = await api.post(CHATBOT_MARK_READ_V2, { conversation_id: cid }, { timeout: 15_000 });
  return (res.data || {}) as {
    agent_last_read_at?: string | null;
    customer_last_read_at?: string | null;
  };
}

/** Statut lecture (ticks « lu » sur les messages envoyés par le client). */
export async function fetchChatbotReadStatus(conversationId: string): Promise<{
  agent_last_read_at?: string | null;
  customer_last_read_at?: string | null;
}> {
  const cid = (conversationId || '').trim();
  if (!cid) return {};
  const res = await api.get(CHATBOT_MARK_READ_V2, {
    params: { conversation_id: cid },
    timeout: 15_000,
  });
  return (res.data || {}) as {
    agent_last_read_at?: string | null;
    customer_last_read_at?: string | null;
  };
}

export async function uploadChatImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await api.post(UPLOAD_FILE, form, {
    timeout: 60_000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const data = res.data as { image?: string | null; file?: string | null };
  const url = (data.image || data.file || '').trim();
  if (!url) {
    throw new Error('Upload réussi mais aucune URL renvoyée.');
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}
