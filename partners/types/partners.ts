export interface PartnerPublicDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  telegramHandle: string | null;
  refCode: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  revsharePercent: number;
  balance: string;
  totalEarned: string;
  createdAt: string;
}

export interface PartnerWithdrawalDTO {
  id: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface PartnerReferralDTO {
  id: string;
  registeredAt: string;
  ftdAt: string | null;
  ftdAmount: string | null;
  totalDeposits: string;
  totalTrades: number;
  earned: string;
  lastActiveAt: string | null;
}

export interface PartnerEarningDTO {
  id: string;
  amount: string;
  referralId: string;
  createdAt: string;
}

export interface PartnerDashboardStats {
  clicksTotal: number;
  clicksToday: number;
  clicksThisMonth: number;
  registrationsTotal: number;
  registrationsToday: number;
  registrationsThisMonth: number;
  ftdTotal: number;
  ftdToday: number;
  ftdThisMonth: number;
  conversionRate: number;
  earningsTotal: string;
  earningsToday: string;
  earningsThisMonth: string;
  balance: string;
  activeReferrals: number;
}

export interface PartnerChartPoint {
  date: string;
  clicks: number;
  registrations: number;
  ftd: number;
  earnings: string;
}

export interface PartnerDashboardDTO {
  refCode: string;
  refUrl: string;
  stats: PartnerDashboardStats;
  chartData: PartnerChartPoint[];
}

export interface ReferralsResponse {
  referrals: PartnerReferralDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export interface EarningsResponse {
  earnings: PartnerEarningDTO[];
  total: number;
  totalAmount: string;
}

export interface WithdrawalsResponse {
  withdrawals: PartnerWithdrawalDTO[];
  balance: string;
}
