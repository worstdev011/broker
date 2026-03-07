import { render, screen } from '@testing-library/react';
import TerminalLoading from '../terminal/loading';
import ProfileLoading from '../profile/loading';
import TradeLoading from '../trade/loading';
import WalletLoading from '../wallet/loading';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

describe('Loading components', () => {
  it('TerminalLoading shows logo and text', () => {
    render(<TerminalLoading />);
    expect(screen.getByAltText('Comfortrade')).toBeInTheDocument();
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('ProfileLoading shows logo and text', () => {
    render(<ProfileLoading />);
    expect(screen.getByAltText('Comfortrade')).toBeInTheDocument();
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('TradeLoading shows logo and text', () => {
    render(<TradeLoading />);
    expect(screen.getByAltText('Comfortrade')).toBeInTheDocument();
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('WalletLoading shows logo and text', () => {
    render(<WalletLoading />);
    expect(screen.getByAltText('Comfortrade')).toBeInTheDocument();
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });
});
