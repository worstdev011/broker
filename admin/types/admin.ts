// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  role: "ADMIN";
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

// ─── User DTOs ────────────────────────────────────────────────────────────────

export interface AdminUserDTO {
  id: string;
  email: string;
  nickname: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  kycStatus: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  realBalance: string;
  demoBalance: string;
}

export interface AdminUserDetailDTO extends AdminUserDTO {
  phone: string | null;
  country: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  currency: string;
  googleId: string | null;
  kycApplicantId: string | null;
  lastLoginAt: string | null;
  ipAddress: string | null;
}

// ─── Account ──────────────────────────────────────────────────────────────────

export interface AdminAccountDTO {
  id: string;
  type: "DEMO" | "REAL";
  balance: string;
  currency: string;
  isActive: boolean;
}

// ─── Trade ────────────────────────────────────────────────────────────────────

export type TradeStatus = "OPEN" | "WIN" | "LOSS" | "TIE";
export type TradeDirection = "CALL" | "PUT";

export interface AdminTradeDTO {
  id: string;
  userId: string;
  userEmail: string;
  instrument: string;
  direction: TradeDirection;
  amount: string;
  entryPrice: string;
  exitPrice: string | null;
  payoutPercent: number;
  payoutAmount: string | null;
  status: TradeStatus;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType = "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface AdminTransactionDTO {
  id: string;
  userId: string;
  userEmail: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  paymentMethod: string;
  cardLastFour: string | null;
  externalId: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface AdminSessionDTO {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

// ─── Instrument ───────────────────────────────────────────────────────────────

export type InstrumentType = "REAL" | "OTC";

export interface AdminInstrumentDTO {
  id: string;
  name: string;
  base: string;
  quote: string;
  type: InstrumentType;
  isActive: boolean;
  payoutPercent: number;
  sortOrder: number;
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface DashboardStats {
  usersTotal: number;
  usersToday: number;
  activeNow: number;
  tradesOpenNow: number;
  tradesToday: number;
  volumeToday: number;
  depositsToday: number;
  withdrawalsToday: number;
  pendingWithdrawals: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
}

export interface UsersListResponse {
  users: AdminUserDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserDetailResponse {
  user: AdminUserDetailDTO;
  accounts: AdminAccountDTO[];
  stats: {
    totalTrades: number;
    winRate: number;
    totalVolume: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  recentTrades: AdminTradeDTO[];
  recentTransactions: AdminTransactionDTO[];
  activeSessions: AdminSessionDTO[];
}

export interface TradesListResponse {
  trades: AdminTradeDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ActiveTradesResponse {
  trades: AdminTradeDTO[];
}

export interface InstrumentsListResponse {
  instruments: AdminInstrumentDTO[];
}

export interface SessionsResponse {
  activeConnections: number;
  connections: Array<{
    userId: string;
    email: string;
    connectedAt: number;
    subscriptions: string[];
  }>;
}

export interface SuccessResponse {
  success: true;
}

export interface AdjustBalanceResponse extends SuccessResponse {
  newBalance: string;
}
