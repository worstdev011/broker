import { render, screen, fireEvent } from '@testing-library/react';
import ProfileError from '../error';

jest.mock('@/components/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const ru: Record<string, string> = {
      error_profile: 'Ошибка загрузки профиля',
      retry_action: 'Попробовать снова',
      back_to_home: 'На главную',
    };
    return ru[key] ?? key;
  },
}));

describe('ProfileError', () => {
  it('shows profile error message', () => {
    render(<ProfileError error={new Error('Failed to load')} reset={() => {}} />);
    expect(screen.getByText('Ошибка загрузки профиля')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('calls reset on retry', () => {
    const reset = jest.fn();
    render(<ProfileError error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByText('Попробовать снова'));
    expect(reset).toHaveBeenCalled();
  });

  it('has link to home', () => {
    render(<ProfileError error={new Error('x')} reset={() => {}} />);
    expect(screen.getByRole('link', { name: /На главную/i })).toHaveAttribute('href', '/');
  });
});
