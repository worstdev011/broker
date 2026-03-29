/** Message keys under `support` namespace — resolved via useTranslations('support') */

export const FAQ_STRUCTURE = [
  {
    id: 'money',
    titleKey: 'faq_money_title',
    items: [
      { id: 'deposit-how', q: 'faq_money_deposit_how_q', a: 'faq_money_deposit_how_a' },
      { id: 'deposit-limits', q: 'faq_money_deposit_limits_q', a: 'faq_money_deposit_limits_a' },
      { id: 'deposit-time', q: 'faq_money_deposit_time_q', a: 'faq_money_deposit_time_a' },
      { id: 'withdraw-how', q: 'faq_money_withdraw_how_q', a: 'faq_money_withdraw_how_a' },
      { id: 'withdraw-limits', q: 'faq_money_withdraw_limits_q', a: 'faq_money_withdraw_limits_a' },
      { id: 'withdraw-fee', q: 'faq_money_withdraw_fee_q', a: 'faq_money_withdraw_fee_a' },
      { id: 'payment-methods', q: 'faq_money_methods_q', a: 'faq_money_methods_a' },
    ],
  },
  {
    id: 'trading',
    titleKey: 'faq_trading_title',
    items: [
      { id: 'start-trading', q: 'faq_trading_start_q', a: 'faq_trading_start_a' },
      { id: 'demo-account', q: 'faq_trading_demo_q', a: 'faq_trading_demo_a' },
      { id: 'expiration', q: 'faq_trading_expiry_q', a: 'faq_trading_expiry_a' },
      { id: 'payout', q: 'faq_trading_payout_q', a: 'faq_trading_payout_a' },
      { id: 'instruments', q: 'faq_trading_instruments_q', a: 'faq_trading_instruments_a' },
      { id: 'tie', q: 'faq_trading_tie_q', a: 'faq_trading_tie_a' },
    ],
  },
  {
    id: 'security',
    titleKey: 'faq_security_title',
    items: [
      { id: 'verification', q: 'faq_security_verify_q', a: 'faq_security_verify_a' },
      { id: '2fa', q: 'faq_security_2fa_q', a: 'faq_security_2fa_a' },
      { id: 'protect-account', q: 'faq_security_protect_q', a: 'faq_security_protect_a' },
      { id: 'suspicious', q: 'faq_security_suspicious_q', a: 'faq_security_suspicious_a' },
      { id: 'data-protection', q: 'faq_security_data_q', a: 'faq_security_data_a' },
    ],
  },
  {
    id: 'account',
    titleKey: 'faq_account_title',
    items: [
      { id: 'change-email', q: 'faq_account_email_q', a: 'faq_account_email_a' },
      { id: 'change-password', q: 'faq_account_password_q', a: 'faq_account_password_a' },
      { id: 'delete-account', q: 'faq_account_delete_q', a: 'faq_account_delete_a' },
      { id: 'balance-history', q: 'faq_account_history_q', a: 'faq_account_history_a' },
      { id: 'trade-history', q: 'faq_account_trades_q', a: 'faq_account_trades_a' },
    ],
  },
  {
    id: 'other',
    titleKey: 'faq_other_title',
    items: [
      { id: 'minors', q: 'faq_other_minors_q', a: 'faq_other_minors_a' },
      { id: 'countries', q: 'faq_other_countries_q', a: 'faq_other_countries_a' },
      { id: 'taxes', q: 'faq_other_taxes_q', a: 'faq_other_taxes_a' },
      { id: 'promo', q: 'faq_other_promo_q', a: 'faq_other_promo_a' },
      { id: 'responsibility', q: 'faq_other_responsible_q', a: 'faq_other_responsible_a' },
    ],
  },
] as const;

export const TOPIC_OPTION_KEYS = [
  { value: 'deposit', labelKey: 'topic_deposit' },
  { value: 'withdraw', labelKey: 'topic_withdraw' },
  { value: 'trading', labelKey: 'topic_trading' },
  { value: 'account', labelKey: 'topic_account' },
  { value: 'verification', labelKey: 'topic_verification' },
  { value: 'other', labelKey: 'topic_other' },
] as const;
