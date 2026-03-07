import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../global-error';

describe('Global Error (critical)', () => {
  it('renders critical error UI', () => {
    const error = new Error('Critical');
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText('Критическая ошибка')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<GlobalError error={new Error('Fatal')} reset={() => {}} />);
    expect(screen.getByText('Критическая ошибка')).toBeInTheDocument();
    expect(screen.getByText('Fatal')).toBeInTheDocument();
  });

  it('calls reset on Try again', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByText('Попробовать снова'));
    expect(reset).toHaveBeenCalled();
  });
});
