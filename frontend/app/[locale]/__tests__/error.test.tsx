import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../error';

describe('Global Error', () => {
  it('renders error message', () => {
    const err = new Error('Test error');
    render(<GlobalError error={err} reset={() => {}} />);
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls reset on button click', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('Err')} reset={reset} />);
    fireEvent.click(screen.getByText('Попробовать снова'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('has link to home', () => {
    render(<GlobalError error={new Error('Err')} reset={() => {}} />);
    const link = screen.getByRole('link', { name: /главную/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
