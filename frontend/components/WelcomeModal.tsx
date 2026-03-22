'use client';

import { useEffect, useState } from 'react';

interface WelcomeModalProps {
  onStart: () => void;
}

export function WelcomeModal({ onStart }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setVisible(false);
    setTimeout(onStart, 350);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(6, 18, 48, 0.75)',
        transition: 'opacity 0.35s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #0c1e4a 0%, #0a1635 60%, #061230 100%)',
          border: '1px solid rgba(99, 140, 255, 0.18)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,140,255,0.08)',
          maxWidth: '420px',
          width: '100%',
          overflow: 'hidden',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
        }}
      >
        {/* Illustration placeholder */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            height: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.02em' }}>
            тут будет фотка
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px 32px' }}>
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '22px',
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#f0f4ff',
              letterSpacing: '-0.02em',
            }}
          >
            Добро пожаловать!
          </h2>

          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'rgba(180,200,255,0.7)',
            }}
          >
            Давай проведём небольшой тур по платформе - покажем, где что находится и как начать торговать.
          </p>

          {/* CTA Button */}
          <button
            type="button"
            onClick={handleStart}
            className="btn-accent"
            style={{
              width: '100%',
              padding: '13px 24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Начать тур →
          </button>
        </div>
      </div>
    </div>
  );
}
