import { render, screen } from '@testing-library/react';
import TerminalLoading from '../terminal/loading';
import ProfileLoading from '../profile/loading';

describe('Loading components', () => {
  it('TerminalLoading shows spinner', () => {
    const { container } = render(<TerminalLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('ProfileLoading shows spinner', () => {
    const { container } = render(<ProfileLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
