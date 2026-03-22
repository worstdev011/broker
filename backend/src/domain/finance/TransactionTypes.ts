export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRADE_RESULT = 'TRADE_RESULT',
  BONUS = 'BONUS',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CRYPTO = 'CRYPTO',
  BANK = 'BANK',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  PAYPAL = 'PAYPAL',
  QIWI = 'QIWI',
  YOOMONEY = 'YOOMONEY',
  WEBMONEY = 'WEBMONEY',
  SKRILL = 'SKRILL',
  NETELLER = 'NETELLER',
  ADVANCED_CASH = 'ADVANCED_CASH',
  SBP = 'SBP',
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  provider: string | null;
  externalId: string | null;
  externalStatus: string | null;
  cardLastFour: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface CreateTransactionDto {
  userId: string;
  accountId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  provider?: string | null;
  externalId?: string | null;
  externalStatus?: string | null;
  cardLastFour?: string | null;
}

export interface TransactionUpdateDto {
  status?: TransactionStatus;
  externalId?: string | null;
  externalStatus?: string | null;
  confirmedAt?: Date | null;
}
