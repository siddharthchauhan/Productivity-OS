import React, { useEffect, useState } from 'react';
import { Card, SectionLabel } from '../components/Primitives';
import { Icon } from '../lib/icons';
import { api } from '../lib/api';
import type { AppSettings } from '@shared/types';

const GRADIENTS: Array<{ id: AppSettings['gradient']; label: string; preview: string }> = [
  { id: 'azure',  label: 'Azure',  preview: 'linear-gradient(135deg, #1D4ED8, #3B82F6, #60A5FA)' },
  { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg, #6366F1, #A855F7, #EC4899)' },
  { id: 'ocean',  label: 'Ocean',  preview: 'linear-gradient(135deg, #0891B2, #2563EB, #6366F1)' },
  { id: 'mint',   label: 'Mint',   preview: 'linear-gradient(135deg, #10B981, #06B6D4, #3B82F6)' },
  { id: 'ember',  label: 'Ember',  preview: 'linear-gradient(135deg, #F59E0B, #F43F5E, #A855F7)' }
];

export function Settings({
  settings, onChange, onClose
}: { settings: AppSettings; onChange: (s: AppSettings) => void; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const update = async (patch: Partial<AppSettings>) => {
    const merged = await api.settings.set(patch);
    onChange(merged);
  };

  const saveKey = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const { ok } = await api.settings.setAnthropicKey(key);
      if (!ok) { setMsg('Key must start with sk-ant-'); return; }
      const merged = await api.settings.get();
      onChange(merged);
      setKey('');
      setMsg('Saved.');
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    await api.settings.clearAnthropicKey();
    const merged = await api.settings.get();
    onChange(merged);
    setMsg('Key cleared.');
  };

  const toggleTracker = async () => {
    if (settings.trackingEnabled) await api.tracker.stop();
    else await api.tracker.start();
    update({ trackingEnabled: !settings.trackingEnabled });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <Card style={{ width: 560, maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <SectionLabel>Settings</SectionLabel>
          <span style={{ flex: 1 }} />
          <button className="iconbtn" onClick={onClose}><Icon.x size={15} /></button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="micro-label" style={{ marginBottom: 8 }}>Anthropic API key</div>
          {settings.hasAnthropicKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: 'var(--fg-1)' }}>Key on file ✓</span>
              <button className="row" style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                onClick={clearKey}>Clear</button>
            </div>
          ) : null}
          <div className="field">
            <input type="password" placeholder="sk-ant-…" value={key}
              onChange={e => setKey(e.target.value)} />
            <div className="field-hint">
              Stored encrypted in your macOS Keychain via Electron safeStorage. Used to generate
              daily reports + suggestions with Claude. Never leaves your machine except for the
              API request itself.
            </div>
          </div>
          <button className="btn-accent" onClick={saveKey} disabled={saving || !key}>
            {saving ? 'Saving…' : 'Save key'}
          </button>
          {msg && <div style={{ fontSize: 11.5, color: 'var(--fg-2)', marginTop: 8 }}>{msg}</div>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="micro-label" style={{ marginBottom: 8 }}>Model</div>
          <div className="field">
            <select value={settings.model} onChange={e => update({ model: e.target.value })}>
              <option value="claude-opus-4-7">Claude Opus 4.7 (slowest, deepest)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (recommended)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest, cheapest)</option>
            </select>
            <div className="field-hint">Sonnet is the right default — Opus is overkill for daily reports.</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="micro-label" style={{ marginBottom: 8 }}>Tracking</div>
          <Toggle label="Background tracking" sub="Records foreground app + window title every 5s"
            on={settings.trackingEnabled} onToggle={toggleTracker} />
          <Toggle label="Capture window titles"
            sub="Off = only the app name is recorded (more private, less precise)"
            on={settings.captureWindowTitles}
            onToggle={() => update({ captureWindowTitles: !settings.captureWindowTitles })} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="micro-label" style={{ marginBottom: 8 }}>Appearance</div>
          <Toggle label="Dark mode" on={settings.theme === 'dark'}
            onToggle={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8 }}>Gradient</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRADIENTS.map(g => (
                <button key={g.id}
                  onClick={() => update({ gradient: g.id })}
                  style={{
                    padding: '6px 10px',
                    border: settings.gradient === g.id
                      ? '2px solid var(--accent)'
                      : '1px solid var(--stroke)',
                    borderRadius: 999,
                    fontSize: 11.5, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'var(--bg-raised)',
                    color: 'var(--fg-1)'
                  }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: g.preview }} />
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="micro-label" style={{ marginBottom: 8 }}>Schedule</div>
          <div className="field">
            <label>Daily report cron (local time)</label>
            <input value={settings.dailyCron}
              onChange={e => update({ dailyCron: e.target.value })}
              placeholder="30 18 * * *" />
            <div className="field-hint">
              Default is 6:30 PM. Use any standard cron expression. Monthly report fires at 9 AM
              on the 1st of each month automatically.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Toggle({
  label, sub, on, onToggle
}: { label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderTop: '1px solid var(--stroke)', width: '100%', textAlign: 'left'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{
        width: 36, height: 20, borderRadius: 999, padding: 2,
        background: on ? 'var(--grad)' : 'var(--bg-press)',
        display: 'inline-flex', alignItems: 'center',
        transition: 'background .15s'
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform .15s var(--ease)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </span>
    </button>
  );
}
