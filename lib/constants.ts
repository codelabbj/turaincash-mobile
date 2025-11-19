// Backend API Constants
// These constants match the choices defined in the backend API

export const TYPE_TRANS = [
  ["deposit", "Dépôt"],
  ["withdrawal", "Retrait"],
  ["disbursements", "Disbursements"],
  ["reward", "reward"],
] as const;

export const TRANS_STATUS = [
  ["init_payment", "En entente"],
  ["accept", "Accept"],
  ["error", "Erreur"],
  ["pending", "Pendind"],
] as const;

export const SOURCE_CHOICE = [
  ["mobile", "Mobile"],
  ["web", "Web"],
  ["bot", "bot"],
] as const;

export const NETWORK_CHOICES = [
  ["mtn", "MTN"],
  ["moov", "MOOV"],
  ["card", "Cart"],
  ["sbin", "Celtis"],
  ["orange", "Orange"],
  ["wave", "wave"],
  ["togocom", "Togocom"],
  ["airtel", "Airtel"],
  ["mpesa", "Mpsesa"],
  ["afrimoney", "Afrimoney"],
] as const;

export const API_CHOICES = [
  ["connect", "Blaffa Connect"],
] as const;

// Type definitions for better TypeScript support
export type TransactionType = typeof TYPE_TRANS[number][0];
export type TransactionStatus = typeof TRANS_STATUS[number][0];
export type SourceType = typeof SOURCE_CHOICE[number][0];
export type NetworkType = typeof NETWORK_CHOICES[number][0];
export type ApiType = typeof API_CHOICES[number][0];

// Helper functions to get display names
export const getTransactionTypeLabel = (type: TransactionType): string => {
  const found = TYPE_TRANS.find(([key]) => key === type);
  return found ? found[1] : type;
};

export const getTransactionStatusLabel = (status: TransactionStatus): string => {
  const found = TRANS_STATUS.find(([key]) => key === status);
  return found ? found[1] : status;
};

export const getSourceLabel = (source: SourceType): string => {
  const found = SOURCE_CHOICE.find(([key]) => key === source);
  return found ? found[1] : source;
};

export const getNetworkLabel = (network: NetworkType): string => {
  const found = NETWORK_CHOICES.find(([key]) => key === network);
  return found ? found[1] : network;
};

export const getApiLabel = (api: ApiType): string => {
  const found = API_CHOICES.find(([key]) => key === api);
  return found ? found[1] : api;
};

// Arrays of just the keys for easier iteration
export const TRANSACTION_TYPES = TYPE_TRANS.map(([key]) => key);
export const TRANSACTION_STATUSES = TRANS_STATUS.map(([key]) => key);
export const SOURCE_TYPES = SOURCE_CHOICE.map(([key]) => key);
export const NETWORK_TYPES = NETWORK_CHOICES.map(([key]) => key);
export const API_TYPES = API_CHOICES.map(([key]) => key);




