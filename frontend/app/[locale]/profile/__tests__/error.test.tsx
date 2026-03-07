import { render, screen, fireEvent } from '@testing-library/react';
import ProfileError from '../error';

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
    expect(screen.getByRole('link', { name: /главную/i })).toHaveAttribute('href', '/');
  });
});
