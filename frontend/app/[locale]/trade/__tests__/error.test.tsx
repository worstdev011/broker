import { render, screen, fireEvent } from '@testing-library/react';
import TradeError from '../error';

describe('TradeError', () => {
  it('shows trade error message', () => {
    render(<TradeError error={new Error('Trade failed')} reset={() => {}} />);
    expect(screen.getByText('Ошибка страницы сделки')).toBeInTheDocument();
  });

  it('has link to terminal', () => {
    render(<TradeError error={new Error('x')} reset={() => {}} />);
    expect(screen.getByRole('link', { name: /терминал/i })).toHaveAttribute('href', '/terminal');
  });
});
