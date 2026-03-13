'use client';

import React from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 🔥 FIX #13: Error Boundary для графика — изолирует крэш графика от всей страницы
 */
export class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('[ChartErrorBoundary] Chart crashed:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: '#1a1a2e',
            color: '#8888aa',
            fontFamily: 'system-ui, sans-serif',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 14 }}>Chart rendering error</span>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid #444466',
              background: '#2a2a4e',
              color: '#ccccee',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
