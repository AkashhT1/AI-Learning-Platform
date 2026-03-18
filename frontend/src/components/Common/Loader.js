import React from 'react';

export default function Loader({ fullscreen, size = 36 }) {
  const spinner = (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `3px solid rgba(139,92,246,0.18)`,
      borderTopColor: '#8B5CF6',
      animation: 'spin 0.75s linear infinite'
    }} />
  );

  if (fullscreen) return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0D0F1E',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, zIndex: 9999
    }}>
      <div style={{ fontSize: 42, animation: 'pulse 1.5s infinite' }}>📚</div>
      {spinner}
      <p style={{ color: '#A0A8CC', fontSize: 14, fontWeight: 600 }}>Loading VidyaAI…</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
      {spinner}
      <p style={{ color: '#545880', fontSize: 13, fontWeight: 600 }}>Loading…</p>
    </div>
  );
}
