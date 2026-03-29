import { render, screen, fireEvent } from '@testing-library/react';
import TerminalError from '../error';

jest.mock('@/components/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const ru: Record<string, string> = {
      error_generic: 'Что-то пошло не так',
      retry_action: 'Попробовать снова',
      back_to_home: 'На главную',
    };
    return ru[key] ?? key;
  },
}));

describe('TerminalError', () => {
  it('shows error message', () => {
    render(<TerminalError error={new Error('Connection lost')} reset={() => {}} />);
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('calls reset on retry', () => {
    const reset = jest.fn();
    render(<TerminalError error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByText('Попробовать снова'));
    expect(reset).toHaveBeenCalled();
  });
});
