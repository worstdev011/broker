import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import GlobalError from '../error';
import enMessages from '../../../messages/en.json';

jest.mock('@/components/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('Segment error UI', () => {
  it('renders error message', () => {
    const err = new Error('Test error');
    render(<GlobalError error={err} reset={() => {}} />, { wrapper });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls reset on button click', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('Err')} reset={reset} />, { wrapper });
    fireEvent.click(screen.getByText('Try again'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('has link to home', () => {
    render(<GlobalError error={new Error('Err')} reset={() => {}} />, { wrapper });
    const link = screen.getByRole('link', { name: /home/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
