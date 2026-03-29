import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../global-error';

jest.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
}));

describe('Global Error (critical)', () => {
  it('renders critical error UI', () => {
    const error = new Error('Critical');
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText('Critical error')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<GlobalError error={new Error('Fatal')} reset={() => {}} />);
    expect(screen.getByText('Critical error')).toBeInTheDocument();
    expect(screen.getByText('Fatal')).toBeInTheDocument();
  });

  it('calls reset on Try again', () => {
    const reset = jest.fn();
    render(<GlobalError error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByText('Try again'));
    expect(reset).toHaveBeenCalled();
  });
});
