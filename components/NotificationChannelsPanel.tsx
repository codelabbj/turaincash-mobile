'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, MessageCircle, Phone, Send, X } from 'lucide-react';
import api from '@/lib/api';

/** Couleurs TURAINCASH — accent cyan */
const CHANNEL_ACCENT = 'border-[#00acc1]/40 ring-1 ring-[#00acc1]/15';
const BTN_PRIMARY = 'bg-[#00acc1] hover:bg-[#00838f] text-white';
const BTN_OUTLINE = 'border border-[#00acc1] text-[#006064] dark:text-cyan-300';
const ICON_BRAND = 'text-[#006064] dark:text-cyan-400';
const SELECT_CLASS =
  'w-32 shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#00acc1] focus:border-transparent dark:border-slate-500 dark:bg-slate-700 dark:text-white';
const INPUT_CLASS =
  'min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#00acc1] focus:border-transparent dark:border-slate-500 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400';
const INPUT_FULL_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#00acc1] focus:border-transparent dark:border-slate-500 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400';

export const DISMISS_COUNT_KEY = 'turaincashNotificationPromptDismissCount_v2';
export const MAX_DISMISS_COUNT = 3;

export const countries = [
  { name: "Côte d'Ivoire", code: '225', flag: '🇨🇮' },
  { name: 'Burkina Faso', code: '226', flag: '🇧🇫' },
  { name: 'Bénin', code: '229', flag: '🇧🇯' },
  { name: 'Sénégal', code: '221', flag: '🇸🇳' },
  { name: 'Togo', code: '228', flag: '🇹🇬' },
  { name: 'Mali', code: '223', flag: '🇲🇱' },
  { name: 'Niger', code: '227', flag: '🇳🇪' },
  { name: 'Ghana', code: '233', flag: '🇬🇭' },
  { name: 'Nigeria', code: '234', flag: '🇳🇬' },
];

type ChannelKey = 'whatsapp' | 'telegram' | 'sms';

export type ChannelStatus = {
  useWhatsapp: boolean;
  useTelegram: boolean;
  useSms: boolean;
  whatsappVerified: boolean;
  telegramVerified: boolean;
  smsVerified: boolean;
  pendingCount: number;
  loading: boolean;
};

export function parseSettings(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export function splitPhoneNumber(fullPhone: string, indicative: string) {
  const fallbackCode = indicative.replace(/\D/g, '') || countries[0].code;
  const digits = fullPhone.replace(/\D/g, '');
  if (!digits) {
    return { countryCode: fallbackCode, localPhone: '' };
  }
  if (fallbackCode && digits.startsWith(fallbackCode) && digits.length > fallbackCode.length) {
    return { countryCode: fallbackCode, localPhone: digits.slice(fallbackCode.length) };
  }
  const detected = countries.find(
    (c) => digits.startsWith(c.code) && digits.length > c.code.length
  );
  if (detected) {
    return { countryCode: detected.code, localPhone: digits.slice(detected.code.length) };
  }
  return { countryCode: fallbackCode, localPhone: digits };
}

export function getDefaultPhonesFromUser(user: Record<string, unknown> | null | undefined) {
  const indicative = user?.phone_indicative
    ? String(user.phone_indicative).replace(/\D/g, '')
    : countries[0].code;

  const profile = user?.phone
    ? splitPhoneNumber(String(user.phone), indicative)
    : { countryCode: indicative, localPhone: '' };

  const hasSavedWhatsapp = Boolean(user?.user_whatsapp_phone);
  const whatsappSource = user?.user_whatsapp_phone
    ? String(user.user_whatsapp_phone)
    : user?.phone
      ? String(user.phone)
      : '';

  const whatsapp = whatsappSource
    ? splitPhoneNumber(whatsappSource, indicative)
    : profile;

  return {
    countryCode: hasSavedWhatsapp
      ? whatsapp.countryCode || profile.countryCode || indicative
      : profile.countryCode || whatsapp.countryCode || indicative,
    smsPhone: profile.localPhone,
    whatsappPhone: whatsapp.localPhone || profile.localPhone,
  };
}

export function parseTelegramUsernameInput(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  let username = value;
  if (username.includes('t.me/')) {
    username = username.split('t.me/').pop()?.split('?')[0].split('/')[0] || '';
  }
  return username.replace(/^@+/, '').toLowerCase();
}

const CHANNEL_SESSION_KEY = 'turaincash_channel_panel_state';
const CHANNEL_SESSION_TS = 'turaincash_channel_panel_ts';
const CHANNEL_SESSION_TTL_MS = 5 * 60 * 1000;

type CachedChannelState = {
  showWhatsapp: boolean;
  showTelegram: boolean;
  showSms: boolean;
  whatsappVerified: boolean;
  telegramVerified: boolean;
  smsVerified: boolean;
  countryCode: string;
  whatsappPhone: string;
  smsPhone: string;
  telegramUsername: string;
  telegramLink: string;
};

function readChannelSessionCache(): CachedChannelState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHANNEL_SESSION_KEY);
    return raw ? (JSON.parse(raw) as CachedChannelState) : null;
  } catch {
    return null;
  }
}

function writeChannelSessionCache(state: CachedChannelState) {
  sessionStorage.setItem(CHANNEL_SESSION_KEY, JSON.stringify(state));
  sessionStorage.setItem(CHANNEL_SESSION_TS, String(Date.now()));
}

function invalidateChannelSessionCache() {
  sessionStorage.removeItem(CHANNEL_SESSION_KEY);
  sessionStorage.removeItem(CHANNEL_SESSION_TS);
}

function openTelegramUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function hasAnyChannelVerified(user: Record<string, unknown> | null | undefined) {
  const whatsappOk = Boolean(
    user?.whatsapp_verified || user?.user_whatsapp_phone || user?.whatsapp
  );
  return Boolean(whatsappOk || user?.telegram_verified || user?.sms_verified);
}

export function useNotificationChannelStatus(autoFetch = true) {
  const [status, setStatus] = useState<ChannelStatus>({
    useWhatsapp: false,
    useTelegram: false,
    useSms: false,
    whatsappVerified: false,
    telegramVerified: false,
    smsVerified: false,
    pendingCount: 0,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setStatus((prev) => ({ ...prev, loading: false, pendingCount: 0 }));
      return;
    }

    try {
      const [settingsResponse, userResponse] = await Promise.all([
        api.get('/mobcash/v2/setting/'),
        api.get('/auth/me'),
      ]);
      const settings = parseSettings(settingsResponse.data);
      const user = userResponse.data;

      const useWhatsapp = Boolean(settings?.use_whatsapp);
      const useTelegram = Boolean(settings?.use_telegram);
      const useSms = Boolean(settings?.use_sms);
      const whatsappVerified = Boolean(user?.whatsapp_verified || user?.user_whatsapp_phone || user?.whatsapp);
      const telegramVerified = Boolean(user?.telegram_verified);
      const smsVerified = Boolean(user?.sms_verified);

      const pendingCount = [
        useWhatsapp && !whatsappVerified,
        useTelegram && !telegramVerified,
        useSms && !smsVerified,
      ].filter(Boolean).length;

      setStatus({
        useWhatsapp,
        useTelegram,
        useSms,
        whatsappVerified,
        telegramVerified,
        smsVerified,
        pendingCount,
        loading: false,
      });
    } catch {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (autoFetch) refresh();
  }, [autoFetch, refresh]);

  return { ...status, refresh };
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00acc1]/15 text-[11px] font-bold text-[#006064] dark:bg-[#00acc1]/25 dark:text-cyan-300">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function ChannelCard({
  title,
  icon,
  accent,
  open,
  onToggle,
  alwaysOpen,
  done,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  open: boolean;
  onToggle: () => void;
  alwaysOpen?: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  const bodyVisible = alwaysOpen || open;

  return (
    <div className={`overflow-hidden rounded-2xl border ${bodyVisible ? accent : 'border-slate-200 dark:border-slate-700'}`}>
      {alwaysOpen ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="text-xs">
                {done ? (
                  <span className={ICON_BRAND}>Connecté</span>
                ) : (
                  <span className="text-orange-500">À configurer</span>
                )}
              </p>
            </div>
          </div>
          {done && <CheckCircle2 className={`h-5 w-5 ${ICON_BRAND}`} />}
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="text-xs text-slate-500">
                {done ? (
                  <span className={ICON_BRAND}>Connecté</span>
                ) : (
                  <span className="text-orange-500">À configurer</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {done && !open ? (
              <CheckCircle2 className={`h-5 w-5 ${ICON_BRAND}`} />
            ) : (
              <ChevronDown className={`h-5 w-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            )}
          </div>
        </button>
      )}
      {bodyVisible && <div className={`px-4 pb-4 pt-3 ${alwaysOpen ? '' : 'border-t border-slate-100 dark:border-slate-800'}`}>{children}</div>}
    </div>
  );
}

type PanelProps = {
  mode?: 'prompt' | 'profile';
  onAllDone?: () => void;
  onClose?: () => void;
  showLaterButton?: boolean;
  showHeader?: boolean;
  onStatusChange?: () => void;
};

export default function NotificationChannelsPanel({
  mode = 'profile',
  onAllDone,
  onClose,
  showLaterButton = false,
  showHeader = true,
  onStatusChange,
}: PanelProps) {
  const [initialized, setInitialized] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelKey | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const isProfileMode = mode === 'profile';
  const [countryCode, setCountryCode] = useState(countries[0].code);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollingTelegram, setPollingTelegram] = useState(false);
  const telegramSubmittingRef = useRef(false);
  const skipStatusCallbackRef = useRef(true);

  const applyChannelState = useCallback((state: CachedChannelState) => {
    setWhatsappVerified(state.whatsappVerified);
    setTelegramVerified(state.telegramVerified);
    setSmsVerified(state.smsVerified);
    setShowWhatsapp(state.showWhatsapp);
    setShowTelegram(state.showTelegram);
    setShowSms(state.showSms);
    setCountryCode(state.countryCode);
    setSmsPhone(state.smsPhone);
    setWhatsappPhone(state.whatsappPhone);
    setTelegramUsername(state.telegramUsername);
    setTelegramLink(state.telegramLink);
    setInitialized(true);
  }, []);

  const loadData = useCallback(async (background = false) => {
    const cached = readChannelSessionCache();
    const cachedAt = Number(sessionStorage.getItem(CHANNEL_SESSION_TS) || '0');
    const cacheIsFresh = cached && Date.now() - cachedAt < CHANNEL_SESSION_TTL_MS;

    if (cached && !background) {
      applyChannelState(cached);
      if (cacheIsFresh) return;
    }

    try {
      const [settingsResponse, userResponse] = await Promise.all([
        api.get('/mobcash/v2/setting/'),
        api.get('/auth/me'),
      ]);

      const settings = parseSettings(settingsResponse.data);
      const user = userResponse.data;

      const useWhatsapp = Boolean(settings?.use_whatsapp);
      const useTelegram = Boolean(settings?.use_telegram);
      const useSms = Boolean(settings?.use_sms);
      const waVerified = Boolean(user?.whatsapp_verified || user?.user_whatsapp_phone || user?.whatsapp);
      const tgVerified = Boolean(user?.telegram_verified);
      const smVerified = Boolean(user?.sms_verified);

      setWhatsappVerified(waVerified);
      setTelegramVerified(tgVerified);
      setSmsVerified(smVerified);

      if (mode === 'prompt') {
        setShowWhatsapp(useWhatsapp && !waVerified);
        setShowTelegram(useTelegram && !tgVerified);
        setShowSms(useSms && !smVerified);
        setActiveChannel(
          useWhatsapp && !waVerified ? 'whatsapp' : useTelegram && !tgVerified ? 'telegram' : 'sms'
        );
      } else {
        setShowWhatsapp(useWhatsapp);
        setShowTelegram(useTelegram);
        setShowSms(useSms);
        setActiveChannel(null);
      }

      const defaults = getDefaultPhonesFromUser(user);
      setCountryCode(defaults.countryCode);
      setSmsPhone(defaults.smsPhone);
      setWhatsappPhone(defaults.whatsappPhone);

      let telegramLinkValue = '';
      if (user?.user_telegram_username) {
        setTelegramUsername(String(user.user_telegram_username));
      }

      if (useTelegram) {
        try {
          const linkResponse = await api.get('/auth/telegram-link');
          telegramLinkValue = linkResponse.data?.link || '';
          setTelegramLink(telegramLinkValue);
        } catch {
          setTelegramLink('');
        }
      }

      const nextState: CachedChannelState = {
        showWhatsapp: mode === 'prompt' ? useWhatsapp && !waVerified : useWhatsapp,
        showTelegram: mode === 'prompt' ? useTelegram && !tgVerified : useTelegram,
        showSms: mode === 'prompt' ? useSms && !smVerified : useSms,
        whatsappVerified: waVerified,
        telegramVerified: tgVerified,
        smsVerified: smVerified,
        countryCode: defaults.countryCode,
        whatsappPhone: defaults.whatsappPhone,
        smsPhone: defaults.smsPhone,
        telegramUsername: user?.user_telegram_username ? String(user.user_telegram_username) : '',
        telegramLink: telegramLinkValue,
      };
      writeChannelSessionCache(nextState);
      setInitialized(true);

      if (!skipStatusCallbackRef.current) {
        onStatusChange?.();
      }
    } catch (err) {
      console.error('Erreur chargement canaux:', err);
      setInitialized(true);
    }
  }, [mode, onStatusChange, applyChannelState]);

  useEffect(() => {
    loadData();
    skipStatusCallbackRef.current = false;
  }, [loadData]);

  useEffect(() => {
    if (!pollingTelegram) return;

    let attempts = 0;
    const maxAttempts = 40;

    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        setPollingTelegram(false);
        setError(
          'Connexion non détectée. Cliquez « Valider mon Telegram » pour rouvrir le bot, puis appuyez sur Start (pas un /start tapé à la main).'
        );
        return;
      }

      try {
        const response = await api.get('/auth/telegram-status');
        if (response.data?.telegram_verified) {
          setPollingTelegram(false);
          setTelegramVerified(true);
          if (response.data?.user_telegram_username) {
            setTelegramUsername(String(response.data.user_telegram_username));
          }
          if (mode === 'prompt') {
            setShowTelegram(false);
            onAllDone?.();
          }
          setSuccess('Telegram connecté avec succès.');
          onStatusChange?.();
          invalidateChannelSessionCache();
          await loadData();
        }
      } catch (err) {
        console.error('Erreur polling Telegram:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingTelegram, mode, onAllDone, onStatusChange, loadData]);

  const handleLater = () => {
    const dismissCount = Number(localStorage.getItem(DISMISS_COUNT_KEY) || '0');
    localStorage.setItem(DISMISS_COUNT_KEY, String(dismissCount + 1));
    onClose?.();
  };

  const handleWhatsappSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const digitsOnly = whatsappPhone.replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      setError('Veuillez entrer un numéro WhatsApp valide.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/whatsapp-phone', {
        user_whatsapp_phone: `${countryCode}${digitsOnly}`,
      });
      const verified = Boolean(
        response.data?.whatsapp_verified ||
          response.data?.user_whatsapp_phone ||
          response.data?.success
      );
      setWhatsappVerified(verified);
      if (response.data?.user_whatsapp_phone) {
        const parsed = splitPhoneNumber(String(response.data.user_whatsapp_phone), countryCode);
        setCountryCode(parsed.countryCode);
        setWhatsappPhone(parsed.localPhone);
      }
      if (mode === 'prompt') {
        setShowWhatsapp(false);
        onAllDone?.();
      }
      setSuccess('WhatsApp validé. Vous recevrez vos alertes sur ce numéro.');
      onStatusChange?.();
      invalidateChannelSessionCache();
      await loadData();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.details;
      setError(
        message === 'NUMBER_NOT_ON_WHATSAPP'
          ? "Ce numéro n'est pas reconnu sur WhatsApp."
          : message === 'WHATSAPP_DISABLED'
            ? 'WhatsApp est activé mais pas encore configuré côté serveur.'
            : "Impossible d'enregistrer ce numéro WhatsApp."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSmsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const digitsOnly = smsPhone.replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/sms-phone', {
        phone_indicative: countryCode,
        phone: digitsOnly,
      });
      setSmsVerified(Boolean(response.data?.sms_verified));
      if (mode === 'prompt') {
        setShowSms(false);
        onAllDone?.();
      }
      setSuccess('Numéro SMS confirmé. Un message de test vous a été envoyé.');
      onStatusChange?.();
      invalidateChannelSessionCache();
      await loadData();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.details;
      setError(
        message === 'SMS_DISABLED'
          ? 'SMS activé mais pas encore configuré côté serveur.'
          : message === 'SMS_SEND_FAILED'
            ? "Impossible d'envoyer le SMS de confirmation."
            : 'Impossible de valider ce numéro.'
      );
    } finally {
      setLoading(false);
    }
  };

  const ensureTelegramLink = useCallback(async (): Promise<string> => {
    if (telegramLink) return telegramLink;
    try {
      const response = await api.get('/auth/telegram-link');
      const link = String(response.data?.link || '');
      if (link) setTelegramLink(link);
      return link;
    } catch {
      return '';
    }
  }, [telegramLink]);

  const openTelegramBot = async (link?: string) => {
    const botLink = link || (await ensureTelegramLink());
    if (!botLink) {
      setError('Bot Telegram non configuré. Contactez le support.');
      return;
    }
    openTelegramUrl(botLink);
    setPollingTelegram(true);
    setSuccess('Bot TURAINCASH ouvert. Appuyez sur Démarrer / Start, puis revenez ici.');
  };

  const handleTelegramSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const rawInput = telegramUsername.trim();
    if (!rawInput) {
      setError('Entrez votre @username Telegram.');
      return;
    }

    const normalizedUsername = parseTelegramUsernameInput(rawInput);
    if (normalizedUsername) {
      setTelegramUsername(normalizedUsername);
    }

    await openTelegramBot();

    setLoading(true);
    telegramSubmittingRef.current = true;
    try {
      const response = await api.post('/auth/telegram-username', {
        user_telegram_username: normalizedUsername || rawInput,
      });
      setTelegramVerified(Boolean(response.data?.telegram_verified));
      setPollingTelegram(false);
      if (mode === 'prompt') {
        setShowTelegram(false);
        onAllDone?.();
      }
      setSuccess('Telegram connecté avec succès.');
      onStatusChange?.();
      invalidateChannelSessionCache();
      await loadData();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.details;
      const botLink = err?.response?.data?.link as string | undefined;
      if (message === 'USER_MUST_START_BOT' && botLink) {
        setTelegramLink(botLink);
        await openTelegramBot(botLink);
        setError('Appuyez sur Start dans le bot TURAINCASH, puis réessayez.');
      } else {
        setError('Démarrez le bot TURAINCASH (Start), puis réessayez.');
      }
    } finally {
      setLoading(false);
      telegramSubmittingRef.current = false;
    }
  };

  const handleTelegramInputBlur = async () => {
    if (telegramSubmittingRef.current || telegramVerified) return;
    if (!telegramUsername.trim()) return;
    await openTelegramBot();
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00acc1] border-t-transparent" />
      </div>
    );
  }

  if (!showWhatsapp && !showTelegram && !showSms) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className={`mx-auto mb-3 h-10 w-10 ${ICON_BRAND}`} />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Aucun canal d&apos;alerte activé pour le moment.
        </p>
      </div>
    );
  }

  const pendingCount = [
    showWhatsapp && !whatsappVerified,
    showTelegram && !telegramVerified,
    showSms && !smsVerified,
  ].filter(Boolean).length;

  return (
    <div>
      {showHeader && (
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00acc1]/15 dark:bg-[#00acc1]/25">
                <Bell className={`h-5 w-5 ${ICON_BRAND}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Mes alertes</h3>
                <p className="text-xs text-slate-500">
                  {pendingCount > 0 ? (
                    <span>
                      <span className="font-semibold text-orange-500">{pendingCount}</span>
                      {' '}canal{pendingCount > 1 ? 'aux' : ''} à configurer
                    </span>
                  ) : (
                    'Tous vos canaux sont connectés'
                  )}
                </p>
              </div>
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Recevez le statut de vos transactions et les annonces importantes sur votre téléphone.
          </p>
        </div>
      )}

      {isProfileMode && !profileExpanded && (
        <button
          type="button"
          onClick={() => setProfileExpanded(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${BTN_PRIMARY}`}
        >
          {pendingCount > 0 ? 'Configurer mes alertes' : 'Gérer mes alertes'}
        </button>
      )}

      <div className={`space-y-3 ${isProfileMode && !profileExpanded ? 'hidden' : ''}`}>
        {showWhatsapp && (
          <ChannelCard
            title="WhatsApp"
            icon={<MessageCircle className={`h-5 w-5 ${ICON_BRAND}`} />}
            accent={CHANNEL_ACCENT}
            alwaysOpen={isProfileMode}
            open={activeChannel === 'whatsapp'}
            onToggle={() => setActiveChannel(activeChannel === 'whatsapp' ? null : 'whatsapp')}
            done={whatsappVerified}
          >
            {whatsappVerified && (
              <p className={`mb-3 text-xs ${ICON_BRAND}`}>
                Numéro connecté. Vous pouvez le modifier ci-dessous.
              </p>
            )}
            <StepList
              steps={[
                'Entrez le numéro WhatsApp que vous utilisez sur votre téléphone.',
                'Nous vérifions que ce numéro est bien actif sur WhatsApp.',
                'Vous recevrez vos alertes de dépôt, retrait et annonces.',
              ]}
            />
            <form onSubmit={handleWhatsappSubmit} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className={SELECT_CLASS}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                      {country.flag} +{country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(event) => setWhatsappPhone(event.target.value)}
                  placeholder="Numéro WhatsApp"
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60 ${BTN_PRIMARY}`}
              >
                {loading ? 'Validation...' : whatsappVerified ? 'Modifier WhatsApp' : 'Valider mon WhatsApp'}
              </button>
            </form>
          </ChannelCard>
        )}

        {showTelegram && (
          <ChannelCard
            title="Telegram"
            icon={<Send className={`h-5 w-5 ${ICON_BRAND}`} />}
            accent={CHANNEL_ACCENT}
            alwaysOpen={isProfileMode}
            open={activeChannel === 'telegram'}
            onToggle={() => setActiveChannel(activeChannel === 'telegram' ? null : 'telegram')}
            done={telegramVerified}
          >
            {telegramVerified && (
              <p className={`mb-3 text-xs ${ICON_BRAND}`}>
                Compte Telegram connecté. Vous pouvez le modifier ci-dessous.
              </p>
            )}
            <StepList
              steps={[
                'Entrez votre @username Telegram ci-dessous.',
                "Le bot TURAINCASH s'ouvre automatiquement — appuyez sur Démarrer / Start.",
                'Revenez ici : la connexion est détectée automatiquement.',
              ]}
            />
            <form onSubmit={handleTelegramSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                value={telegramUsername}
                onChange={(event) => setTelegramUsername(event.target.value)}
                onBlur={handleTelegramInputBlur}
                placeholder="@username Telegram"
                className={INPUT_FULL_CLASS}
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${BTN_OUTLINE}`}
              >
                {loading ? 'Validation...' : telegramVerified ? 'Modifier Telegram' : 'Valider mon Telegram'}
              </button>
              {pollingTelegram && (
                <p className={`text-center text-xs ${ICON_BRAND}`}>En attente de connexion au bot...</p>
              )}
            </form>
          </ChannelCard>
        )}

        {showSms && (
          <ChannelCard
            title="SMS"
            icon={<Phone className={`h-5 w-5 ${ICON_BRAND}`} />}
            accent={CHANNEL_ACCENT}
            alwaysOpen={isProfileMode}
            open={activeChannel === 'sms'}
            onToggle={() => setActiveChannel(activeChannel === 'sms' ? null : 'sms')}
            done={smsVerified}
          >
            {smsVerified && (
              <p className={`mb-3 text-xs ${ICON_BRAND}`}>
                Numéro SMS confirmé. Vous pouvez le modifier ci-dessous.
              </p>
            )}
            <StepList
              steps={[
                'Entrez le numéro où vous souhaitez recevoir les SMS.',
                'Nous vous envoyons un message de confirmation.',
                'Vos alertes TURAINCASH arriveront ensuite par SMS.',
              ]}
            />
            <form onSubmit={handleSmsSubmit} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className={SELECT_CLASS}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                      {country.flag} +{country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={smsPhone}
                  onChange={(event) => setSmsPhone(event.target.value)}
                  placeholder="Numéro mobile"
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60 ${BTN_PRIMARY}`}
              >
                {loading ? 'Envoi...' : smsVerified ? 'Modifier le SMS' : 'Confirmer mon numéro SMS'}
              </button>
            </form>
          </ChannelCard>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-xl bg-[#00acc1]/10 px-4 py-3 text-sm text-[#006064] dark:bg-[#00acc1]/20 dark:text-cyan-300">
          {success}
        </p>
      )}

      {showLaterButton && (
        <button
          type="button"
          onClick={handleLater}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold ${BTN_OUTLINE} dark:border-cyan-400`}
        >
          Plus tard
        </button>
      )}

      {isProfileMode && profileExpanded && (
        <button
          type="button"
          onClick={() => setProfileExpanded(false)}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold ${BTN_OUTLINE} dark:border-cyan-400`}
        >
          Réduire
        </button>
      )}
    </div>
  );
}
