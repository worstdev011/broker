import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика AML/KYC',
  description: 'Политика противодействия отмыванию денег (AML) и проверки клиентов (KYC) COMFORTRADE. Требования к верификации и документам.',
  keywords: ['AML', 'KYC', 'верификация', 'проверка клиентов', 'отмывание денег'],
};

export default function AmlKycLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
