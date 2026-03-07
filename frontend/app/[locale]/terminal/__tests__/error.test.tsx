import { render, screen, fireEvent } from '@testing-library/react';
import TerminalError from '../error';

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
