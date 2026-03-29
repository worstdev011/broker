import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';

jest.mock('@/lib/hooks/useAuth');
jest.mock('@/components/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/profile',
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AuthGuard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verify2FA: jest.fn(),
      checkAuth: jest.fn(),
    });
  });

  it('shows loading when isLoading', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      isLoading: true,
    } as ReturnType<typeof useAuth>);
    const { container } = render(
      <AuthGuard requireAuth>
        <div>Protected</div>
      </AuthGuard>
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders children when authenticated and requireAuth', () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
    render(
      <AuthGuard requireAuth>
        <div>Protected</div>
      </AuthGuard>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders children when not requireAuth', () => {
    render(
      <AuthGuard>
        <div>Public</div>
      </AuthGuard>
    );
    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});
