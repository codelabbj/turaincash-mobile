'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Mic, Pause, Play, Send, Trash2 } from 'lucide-react';
import {
  fetchChatbotHumanMessages,
  sendChatbotAudio,
  sendChatbotMessage,
  uploadChatImage,
} from '@/lib/chatbot-api';

type ChatRole = 'user' | 'assistant';

type ChatBubble = {
  id: string;
  role: ChatRole;
  content: string;
  /** ISO date d'envoi / réception (affichage + filtre 24 h). */
  createdAt?: string;
  /** URL image affichée dans la bulle. */
  imageUrl?: string;
  /** URL locale (blob:) ou distante pour rejouer un vocal. */
  audioUrl?: string;
};

const STORAGE_KEY = 'turaincash_chatbot_session_v1';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type StoredSession = {
  conversationId: string | null;
  messages: ChatBubble[];
  savedAt: number;
};

const WELCOME: ChatBubble = {
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour ! Comment puis-je vous aider ?',
  createdAt: new Date().toISOString(),
};

function isHttpUrl(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith('http://') || t.startsWith('https://');
}

function looksLikeImageUrl(text: string): boolean {
  if (!isHttpUrl(text)) return false;
  const path = text.trim().split('?')[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/.test(path) || path.includes('/media/');
}


const IMAGE_URL_IN_TEXT =
  /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<>"']*)?|https?:\/\/[^\s<>"']*\/media\/[^\s<>"']+/gi;

function extractImageUrlFromText(content: string): string | null {
  const trimmed = (content || '').trim();
  if (!trimmed) return null;
  if (looksLikeImageUrl(trimmed) && !trimmed.includes('\n')) {
    return trimmed;
  }
  const match = trimmed.match(IMAGE_URL_IN_TEXT);
  return match?.[0]?.replace(/[),\].]+$/, '') || null;
}

function stripImageUrlFromText(content: string, imageUrl: string | null): string {
  if (!imageUrl) return (content || '').trim();
  return content
    .replace(imageUrl, '')
    .replace(/^\s*Exemple de capture attendue\s*:?\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isWithinChatWindow(iso?: string, nowMs = Date.now()): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return nowMs - t <= SESSION_TTL_MS;
}

function filterRecentMessages(messages: ChatBubble[]): ChatBubble[] {
  const now = Date.now();
  const kept = messages.filter(
    (m) => m.id === 'welcome' || isWithinChatWindow(m.createdAt, now)
  );
  return kept.length ? kept : [WELCOME];
}

function formatBubbleStamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayDiff = Math.round((startToday - startMsg) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return `Aujourd'hui ${time}`;
  if (dayDiff === 1) return `Hier ${time}`;
  const date = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${date} ${time}`;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSession;
    if (!data?.savedAt || Date.now() - data.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function persistSession(conversationId: string | null, messages: ChatBubble[]) {
  try {
    const recent = filterRecentMessages(messages);
    const payload: StoredSession = {
      conversationId,
      messages: recent.filter((m) => m.id !== 'welcome' || recent.length === 1),
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function TypingDots() {
  return (
    <div
      className="flex items-center gap-1.5 px-1 py-0.5"
      aria-label="En train d'écrire"
      role="status"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function looksLikeAudioUrl(text: string): boolean {
  if (!isHttpUrl(text) && !text.trim().startsWith('blob:')) return false;
  const path = text.trim().split('?')[0].toLowerCase();
  return /\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(path);
}

function isVoicePlaceholder(text: string): boolean {
  const t = (text || '').trim();
  return /^(🎤\s*)?(message\s*vocal|audio)$/i.test(t);
}

function isImagePlaceholder(text: string): boolean {
  const t = (text || '').trim();
  return /^(📷\s*)?(capture|image)$/i.test(t);
}

/** blob: ne survit pas au reload localStorage */
function sanitizeMessages(messages: ChatBubble[]): ChatBubble[] {
  return messages.map((m) => {
    if (m.audioUrl?.startsWith('blob:')) {
      return { ...m, audioUrl: undefined };
    }
    if (m.imageUrl?.startsWith('blob:')) {
      return { ...m, imageUrl: undefined };
    }
    return m;
  });
}

function VoiceUnavailable({ outgoing }: { outgoing: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-[180px] py-0.5 opacity-80">
      <div
        className={`h-[42px] w-[42px] rounded-full flex items-center justify-center ${
          outgoing ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        <Mic className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">Message vocal</span>
        <span className={`text-[11px] ${outgoing ? 'text-white/60' : 'text-gray-500'}`}>
          Lecture indisponible
        </span>
      </div>
    </div>
  );
}

/** Un seul vocal à la fois dans le fil. */
type ActiveVoice = {
  id: string;
  audio: HTMLAudioElement;
  stop: () => void;
};
let activeVoice: ActiveVoice | null = null;

function claimVoice(next: ActiveVoice) {
  if (activeVoice && activeVoice.id !== next.id) {
    activeVoice.stop();
  }
  activeVoice = next;
}

function releaseVoice(id: string) {
  if (activeVoice?.id === id) activeVoice = null;
}

function VoiceMessagePlayer({
  src,
  outgoing,
}: {
  src: string;
  outgoing: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerIdRef = useRef(`voice-${Math.random().toString(36).slice(2)}`);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    const audio = new Audio(src);
    audio.preload = 'metadata';
    audioRef.current = audio;
    const playerId = playerIdRef.current;
    const stopLocal = () => {
      audio.pause();
      setPlaying(false);
      releaseVoice(playerId);
    };
    const onTime = () => {
      setProgress(audio.currentTime);
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      releaseVoice(playerId);
    };
    const onPause = () => {
      if (!audio.ended) setPlaying(false);
      if (activeVoice?.id === playerId && audio.paused) {
        releaseVoice(playerId);
      }
    };
    const onMeta = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onErr = () => {
      setFailed(true);
      stopLocal();
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('error', onErr);
    return () => {
      stopLocal();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('error', onErr);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    const playerId = playerIdRef.current;
    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
        releaseVoice(playerId);
      } else {
        claimVoice({
          id: playerId,
          audio,
          stop: () => {
            audio.pause();
            setPlaying(false);
          },
        });
        await audio.play();
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
      setFailed(true);
      releaseVoice(playerId);
    }
  };

  const seek = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    const d = duration || audio.duration || 0;
    if (!d || !Number.isFinite(d)) {
      void toggle();
      return;
    }
    audio.currentTime = Math.max(0, Math.min(d, fraction * d));
    setProgress(audio.currentTime);
  };

  const fmt = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (failed) return <VoiceUnavailable outgoing={outgoing} />;

  const bars = 36;
  const fraction = duration > 0 ? progress / duration : 0;
  const barHeights = Array.from({ length: bars }, (_, i) => 6 + ((i * 17) % 18));

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] w-[min(100%,260px)] py-0.5">
      <button
        type="button"
        onClick={() => void toggle()}
        className={`h-[42px] w-[42px] shrink-0 rounded-full flex items-center justify-center shadow-sm ${
          outgoing ? 'bg-white text-[#006064]' : 'bg-[#00acc1] text-white'
        }`}
        aria-label={playing ? 'Pause' : 'Écouter'}
      >
        {playing ? (
          <Pause className="h-[22px] w-[22px]" fill="currentColor" />
        ) : (
          <Play className="h-[22px] w-[22px] ml-0.5" fill="currentColor" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <button
          type="button"
          className="w-full h-7 flex items-center gap-[2px] cursor-pointer"
          aria-label="Position audio"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / Math.max(1, rect.width);
            seek(x);
          }}
        >
          {barHeights.map((h, i) => {
            const active = i / bars <= fraction;
            return (
              <span
                key={i}
                className="w-[3px] rounded-full shrink-0"
                style={{
                  height: `${h}px`,
                  backgroundColor: outgoing
                    ? active
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.35)'
                    : active
                      ? '#00acc1'
                      : '#9CA3AF',
                }}
              />
            );
          })}
        </button>
        <span
          className={`text-[11px] tabular-nums leading-none ${
            outgoing ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          {fmt(playing || progress > 0 ? progress : duration)}
        </span>
      </div>
    </div>
  );
}

function BubbleBody({ m }: { m: ChatBubble }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const outgoing = m.role === 'user';
  const embeddedUrl = extractImageUrlFromText(m.content);
  const imgSrc =
    m.imageUrl ||
    embeddedUrl ||
    (looksLikeImageUrl(m.content) ? m.content.trim() : '');
  const caption = stripImageUrlFromText(m.content, imgSrc || embeddedUrl);
  const audioSrc =
    m.audioUrl ||
    (looksLikeAudioUrl(m.content) ? m.content.trim() : '') ||
    '';
  const isAudioMsg = Boolean(audioSrc) || isVoicePlaceholder(m.content);
  const isImageMsg = Boolean(imgSrc) || isImagePlaceholder(m.content);

  if (isAudioMsg) {
    if (audioSrc) return <VoiceMessagePlayer src={audioSrc} outgoing={outgoing} />;
    return <VoiceUnavailable outgoing={outgoing} />;
  }

  if (isImageMsg && imgSrc) {
    return (
      <>
        <button
          type="button"
          className="block text-left -m-0.5"
          onClick={() => setLightbox(imgSrc)}
          aria-label="Agrandir l'image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt="Exemple de capture"
            className="max-h-56 max-w-full rounded-xl object-contain bg-black/10"
          />
        </button>
        {caption &&
        !isImagePlaceholder(caption) &&
        !looksLikeImageUrl(caption) ? (
          <p
            className={`mt-2 whitespace-pre-wrap text-sm ${
              outgoing ? 'text-white' : 'text-gray-800'
            }`}
          >
            {caption}
          </p>
        ) : null}
        {lightbox ? (
          <div
            className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal
            aria-label="Aperçu image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Aperçu"
              className="max-h-full max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : null}
      </>
    );
  }

  if (isImagePlaceholder(m.content)) {
    return (
      <span className={`text-sm ${outgoing ? 'text-white/80' : 'text-gray-500'}`}>
        Image indisponible
      </span>
    );
  }

  return <span className="whitespace-pre-wrap">{m.content}</span>;
}

type SupportChatbotProps = {
  pageKey?: string;
  route?: string;
  screenTitle?: string;
  /** Cache le titre interne (quand le parent affiche déjà un header) */
  hideHeader?: boolean;
  className?: string;
  /** Texte prérempli dans le champ de saisie (ex. réclamation transaction) */
  initialMessage?: string;
};

export function SupportChatbot({
  pageKey = 'support',
  route = '/contact',
  screenTitle = 'Support',
  hideHeader = false,
  className = '',
  initialMessage = '',
}: SupportChatbotProps) {
  const [messages, setMessages] = useState<ChatBubble[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const prefillApplied = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardOnStopRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const recordingSecsRef = useRef(0);

  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      if (saved.conversationId) setConversationId(saved.conversationId);
      if (saved.messages?.length) {
        setMessages(filterRecentMessages(sanitizeMessages(saved.messages)));
      }
    }
    setHydrated(true);
    const t = window.setTimeout(() => inputRef.current?.focus(), 250);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated || prefillApplied.current) return;
    const text = (initialMessage || '').trim();
    if (!text) return;
    prefillApplied.current = true;
    setInput(text);
    const t = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    }, 300);
    return () => window.clearTimeout(t);
  }, [hydrated, initialMessage]);

  useEffect(() => {
    if (!hydrated) return;
    persistSession(conversationId, messages);
  }, [hydrated, conversationId, messages]);

  // Polling des réponses conseiller (prise en main humaine)
  useEffect(() => {
    if (!hydrated || !conversationId) return;
    let cancelled = false;

    const toBubble = (it: {
      id: string;
      content: string;
      media_type?: string;
      media_url?: string;
      created_at?: string;
    }): ChatBubble => {
      const content = it.content || '';
      const mediaUrl = (it.media_url || '').trim();
      const mediaType = (it.media_type || '').trim().toLowerCase();
      const isAudio =
        mediaType === 'audio' ||
        looksLikeAudioUrl(content) ||
        isVoicePlaceholder(content);
      const isImage =
        mediaType === 'image' ||
        looksLikeImageUrl(content) ||
        isImagePlaceholder(content);
      return {
        id: `h-${it.id}`,
        role: 'assistant',
        content,
        createdAt: it.created_at || new Date().toISOString(),
        ...(isImage ? { imageUrl: mediaUrl || (looksLikeImageUrl(content) ? content.trim() : undefined) } : {}),
        ...(isAudio ? { audioUrl: mediaUrl || (looksLikeAudioUrl(content) ? content.trim() : undefined) } : {}),
      };
    };

    const tick = async () => {
      try {
        const items = await fetchChatbotHumanMessages(conversationId, null);
        if (cancelled || !items.length) return;
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          let changed = false;
          for (const it of items) {
            const bubble = toBubble(it);
            const existing = byId.get(bubble.id);
            if (!existing) {
              byId.set(bubble.id, bubble);
              changed = true;
              continue;
            }
            const nextAudio = bubble.audioUrl || existing.audioUrl;
            const nextImage = bubble.imageUrl || existing.imageUrl;
            if (nextAudio !== existing.audioUrl || nextImage !== existing.imageUrl) {
              byId.set(bubble.id, {
                ...existing,
                audioUrl: nextAudio,
                imageUrl: nextImage,
                content: existing.content || bubble.content,
              });
              changed = true;
            }
          }
          if (!changed) return filterRecentMessages(prev);
          const existingIds = new Set(prev.map((m) => m.id));
          const merged = prev.map((m) => byId.get(m.id) || m);
          for (const it of items) {
            const id = `h-${it.id}`;
            if (!existingIds.has(id)) merged.push(byId.get(id)!);
          }
          return filterRecentMessages(merged);
        });
      } catch {
        // silencieux — on retentera au prochain tick
      }
    };

    void tick();
    const intervalId = window.setInterval(() => void tick(), 7000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [hydrated, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendText = async (text: string, opts?: { imageUrl?: string; displayAs?: string }) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError('');
    setInput('');
    const userMsg: ChatBubble = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: opts?.displayAs || trimmed,
      createdAt: new Date().toISOString(),
      imageUrl: opts?.imageUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await sendChatbotMessage({
        message: trimmed,
        conversation_id: conversationId,
        page_key: pageKey,
        route,
        screen_title: screenTitle,
      });
      const reply = (data.message || data.detail || '').trim();
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      if (data.silent && !reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            content:
              "Un conseiller s'occupe déjà de votre demande. Continuez à écrire ici, il verra vos messages.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content: reply || "Je n'ai pas pu répondre pour le moment. Réessayez.",
          ...(extractImageUrlFromText(reply)
            ? { imageUrl: extractImageUrlFromText(reply)! }
            : {}),
        },
      ]);
    } catch (err: unknown) {
      const ax = err as {
        code?: string;
        response?: { status?: number; data?: { detail?: string } };
      };
      const isTimeout = ax.code === 'ECONNABORTED';
      const detail =
        (isTimeout
          ? 'La réponse prend trop de temps. Réessayez dans un instant.'
          : ax.response?.data?.detail) ||
        'Impossible de contacter le chatbot. Réessayez plus tard.';
      setError(String(detail));
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content: String(detail),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || !input.trim()) return;
    await sendText(input);
  };

  const onPickImage = async (file: File | null) => {
    if (!file || sending) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez choisir une image (JPG, PNG…).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image trop lourde (max 8 Mo).');
      return;
    }

    setError('');
    setSending(true);
    try {
      const url = await uploadChatImage(file);
      await sendText(url, { imageUrl: url, displayAs: 'Image' });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { image?: string[] | string; detail?: string } } };
      const imgErr = ax.response?.data?.image;
      const detail =
        (Array.isArray(imgErr) ? imgErr[0] : imgErr) ||
        ax.response?.data?.detail ||
        "Impossible d'envoyer l'image. Réessayez.";
      setError(String(detail));
      setSending(false);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sendAudioFile = async (file: File) => {
    if (sending) return;
    setError('');
    setSending(true);
    const audioUrl = URL.createObjectURL(file);
    const localId = `u-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        role: 'user',
        content: 'Message vocal',
        createdAt: new Date().toISOString(),
        audioUrl,
      },
    ]);
    try {
      const data = await sendChatbotAudio(file, {
        conversation_id: conversationId,
        page_key: pageKey,
        route,
        screen_title: screenTitle,
      });
      if (data.conversation_id) setConversationId(data.conversation_id);
      const durableUrl = (data.user_media_url || '').trim();
      if (durableUrl) {
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, audioUrl: durableUrl } : m))
        );
      }
      const reply = (data.message || data.detail || '').trim();
      if (data.silent && !reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            content:
              "Un conseiller s'occupe déjà de votre demande. Continuez à écrire ici, il verra vos messages.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            content: reply || "Je n'ai pas pu répondre pour le moment. Réessayez.",
            ...(extractImageUrlFromText(reply)
              ? { imageUrl: extractImageUrlFromText(reply)! }
              : {}),
            ...(looksLikeAudioUrl(reply) ? { audioUrl: reply.trim() } : {}),
          },
        ]);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } } };
      const detail =
        ax.response?.data?.detail ||
        'Impossible de traiter le message vocal. Réessayez plus tard.';
      setError(String(detail));
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: String(detail) },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const cleanupAudioGraph = () => {
    if (analyserRafRef.current != null) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
  };

  const stopRecording = (send: boolean) => {
    discardOnStopRef.current = !send;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    } else {
      cleanupAudioGraph();
      setRecording(false);
      setRecordingPaused(false);
      setRecordingSecs(0);
      setAmplitudes([]);
    }
  };

  const togglePauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    try {
      if (recordingPaused) {
        if (typeof recorder.resume === 'function') recorder.resume();
        setRecordingPaused(false);
      } else {
        if (typeof recorder.pause === 'function') recorder.pause();
        setRecordingPaused(true);
      }
    } catch {
      setError('Pause / reprise indisponible sur ce navigateur.');
    }
  };

  const startRecording = async () => {
    if (recording || sending) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError("L'enregistrement audio n'est pas disponible sur ce navigateur.");
      return;
    }
    try {
      // Android APK : popup système RECORD_AUDIO avant getUserMedia.
      const { ensureMicrophonePermission } = await import('@/lib/mic-permission');
      const allowed = await ensureMicrophonePermission();
      if (!allowed) {
        setError(
          'Micro refusé. Ouvrez Réglages → Applications → TurainCash → Autorisations → Microphone, puis réessayez.',
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorderStreamRef.current = stream;
      audioChunksRef.current = [];
      discardOnStopRef.current = false;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) sum += data[i];
            const avg = sum / (data.length || 1) / 255;
            const level = Math.max(0.12, Math.min(1, avg * 1.8));
            setAmplitudes((prev) => [...prev.slice(-41), level]);
            analyserRafRef.current = requestAnimationFrame(tick);
          };
          analyserRafRef.current = requestAnimationFrame(tick);
        }
      } catch {
        /* waveform optionnel */
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        cleanupAudioGraph();
        const discarded = discardOnStopRef.current;
        const secs = recordingSecsRef.current;
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `message-vocal.${extension}`, { type });
        recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        recorderStreamRef.current = null;
        audioChunksRef.current = [];
        setRecording(false);
        setRecordingPaused(false);
        setRecordingSecs(0);
        setAmplitudes([]);
        if (!discarded && blob.size > 0 && secs >= 1) {
          void sendAudioFile(file);
        } else if (!discarded && blob.size > 0) {
          setError('Enregistrement trop court.');
        }
      };
      recorder.start(100);
      setRecording(true);
      setRecordingPaused(false);
      setRecordingSecs(0);
      setAmplitudes([]);
      setError('');
    } catch (err) {
      cleanupAudioGraph();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
      setRecording(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(
          'Micro refusé. Ouvrez Réglages → Applications → TurainCash → Autorisations → Microphone, puis réessayez.',
        );
      } else if (name === 'NotFoundError') {
        setError('Aucun microphone trouvé sur cet appareil.');
      } else {
        setError("Impossible d'accéder au microphone. Vérifiez la permission micro de l'application.");
      }
    }
  };

  useEffect(() => {
    recordingSecsRef.current = recordingSecs;
  }, [recordingSecs]);

  useEffect(() => {
    if (!recording || recordingPaused) return;
    const id = window.setInterval(() => {
      setRecordingSecs((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording, recordingPaused]);

  useEffect(() => {
    return () => {
      discardOnStopRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      cleanupAudioGraph();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const formatRecTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const waveBars = amplitudes.length
    ? amplitudes
    : Array.from({ length: 42 }, () => 0.15);

  return (
    <div
      className={`flex flex-col min-h-0 h-full max-h-full rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm ${className}`}
    >
      {!hideHeader && (
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-lg font-bold text-gray-900 dark:text-white">Assistant TURAINCASH</p>
          <p className="text-sm text-gray-500">Réponses automatiques · support</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => {
          const isMedia =
            Boolean(m.audioUrl) ||
            Boolean(m.imageUrl) ||
            isVoicePlaceholder(m.content) ||
            isImagePlaceholder(m.content) ||
            looksLikeAudioUrl(m.content) ||
            looksLikeImageUrl(m.content);
          return (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                    isMedia ? 'px-3 py-2' : 'px-4 py-2.5'
                  } ${
                    m.role === 'user'
                      ? 'bg-[#00acc1] text-white rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                  }`}
                >
                  <BubbleBody m={m} />
                </div>
                {formatBubbleStamp(m.createdAt) ? (
                  <span className="mt-1 px-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                    {formatBubbleStamp(m.createdAt)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {recording ? (
        <div className="shrink-0 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="rounded-[18px] bg-[#1F2C34] px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium text-base tabular-nums shrink-0">
                {formatRecTime(recordingSecs)}
              </span>
              <div className="flex-1 h-7 flex items-end gap-[2.5px] overflow-hidden">
                {waveBars.map((amp, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-[#C5C9CC] shrink-0"
                    style={{ height: `${Math.max(4, Math.round(amp * 28))}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="h-11 w-11 rounded-full bg-[#3A1C1C] text-[#FF8A80] flex items-center justify-center"
                aria-label="Supprimer"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={togglePauseRecording}
                className="h-11 px-4 rounded-[22px] bg-[#2A3942] text-white flex items-center gap-1.5 font-medium"
              >
                {recordingPaused ? (
                  <Play className="h-[18px] w-[18px]" />
                ) : (
                  <Pause className="h-[18px] w-[18px]" />
                )}
                {recordingPaused ? 'Reprendre' : 'Pause'}
              </button>
              <button
                type="button"
                disabled={sending || recordingSecs < 1}
                onClick={() => stopRecording(true)}
                className="h-12 w-12 rounded-full bg-[#00acc1] text-white flex items-center justify-center disabled:opacity-40"
                aria-label="Envoyer le vocal"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="shrink-0 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-gray-800 flex items-end gap-2 bg-white dark:bg-gray-900"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPickImage(e.target.files?.[0] || null)}
          />
          <div className="flex-1 flex items-end gap-1.5 min-h-[48px] max-h-[140px] rounded-[24px] bg-[#F0F2F5] dark:bg-gray-800 pl-3.5 pr-1 py-1.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder="Message"
              className="flex-1 resize-none bg-transparent border-0 px-0 py-2.5 text-[16px] leading-5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0 min-h-[40px] max-h-[120px]"
              disabled={sending}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => fileRef.current?.click()}
              className="h-10 w-10 shrink-0 self-end rounded-full text-gray-500 flex items-center justify-center disabled:opacity-40"
              aria-label="Joindre une image"
              title="Joindre une capture"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
          {input.trim() ? (
            <button
              type="submit"
              disabled={sending}
              className="h-12 w-12 shrink-0 self-end rounded-full bg-[#00acc1] text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={sending}
              onClick={() => void startRecording()}
              className="h-12 w-12 shrink-0 self-end rounded-full bg-[#00acc1] text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Enregistrer un message vocal"
              title="Message vocal"
            >
              <Mic className="h-6 w-6" />
            </button>
          )}
        </form>
      )}
      {error ? <p className="shrink-0 px-4 pb-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
