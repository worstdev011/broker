import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AppHeader } from '../AppHeader';
import enMessages from '../../messages/en.json';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id: '1', email: 'test@test.com' },
  }),
}));
jest.mock('@/lib/api/api', () => ({
  api: jest.fn().mockRejectedValue(new Error('mock')),
}));
jest.mock('@/stores/account.store', () => {
  const state = { snapshot: null, setSnapshot: jest.fn(), clear: jest.fn() };
  const fn = (selector?: (s: unknown) => unknown) =>
    selector ? selector(state) : state;
  (fn as { getState: () => typeof state }).getState = () => state;
  return { useAccountStore: fn };
});
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('AppHeader', () => {
  it('renders logo', () => {
    render(<AppHeader />, { wrapper });
    expect(screen.getByAltText('Comfortrade')).toBeInTheDocument();
  });

  it('renders profile menu trigger', () => {
    render(<AppHeader />, { wrapper });
    expect(screen.getByLabelText('Open profile menu')).toBeInTheDocument();
  });

  it('has notifications button', () => {
    render(<AppHeader />, { wrapper });
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });
});
