// Catalog of every "source" Pulse can show on the dashboard.
// Whether a source is "connected" today is decided by whether any events with
// that source_id were recorded — the tracker + classifier handle this.

export interface SourceMeta {
  id: string;
  label: string;
  color: string;
  icon: string;
  group: 'work' | 'dev' | 'ai' | 'docs' | 'comms' | 'meet' | 'focus';
  brandLetter?: string;        // fallback when no brand SVG is available
}

export const SOURCES: SourceMeta[] = [
  { id: 'jira',       label: 'Jira',             color: '#2A6FDB', icon: 'workbench', group: 'work',  brandLetter: 'J' },
  { id: 'cursor',     label: 'Cursor',           color: '#111111', icon: 'code',      group: 'ai',    brandLetter: 'C' },
  { id: 'claudecode', label: 'Claude Code',      color: '#C96442', icon: 'sparkle',   group: 'ai',    brandLetter: 'C' },
  { id: 'claudeai',   label: 'Claude.ai',        color: '#C96442', icon: 'brain',     group: 'ai',    brandLetter: 'C' },
  { id: 'chatgpt',    label: 'ChatGPT',          color: '#10A37F', icon: 'sparkle',   group: 'ai',    brandLetter: 'G' },
  { id: 'codex',      label: 'OpenAI Codex',     color: '#0B7A5E', icon: 'terminal',  group: 'ai',    brandLetter: 'X' },
  { id: 'copilot',    label: 'GitHub Copilot',   color: '#6E40C9', icon: 'sparkle',   group: 'ai',    brandLetter: 'C' },
  { id: 'vscode',     label: 'VS Code',          color: '#2D7FF9', icon: 'code',      group: 'dev',   brandLetter: 'V' },
  { id: 'github',     label: 'GitHub',           color: '#1F2328', icon: 'gitBranch', group: 'dev',   brandLetter: 'G' },
  { id: 'excel',      label: 'Excel',            color: '#217346', icon: 'sheet',     group: 'docs',  brandLetter: 'X' },
  { id: 'word',       label: 'Word',             color: '#2B579A', icon: 'doc',       group: 'docs',  brandLetter: 'W' },
  { id: 'powerpoint', label: 'PowerPoint',       color: '#C43E1C', icon: 'slides',    group: 'docs',  brandLetter: 'P' },
  { id: 'outlook',    label: 'Outlook',          color: '#0F6CBD', icon: 'mail',      group: 'comms', brandLetter: 'O' },
  { id: 'gmail',      label: 'Gmail',            color: '#D44638', icon: 'mail',      group: 'comms', brandLetter: 'M' },
  { id: 'slack',      label: 'Slack',            color: '#611f69', icon: 'bell',      group: 'comms', brandLetter: 'S' },
  { id: 'teams',      label: 'Microsoft Teams',  color: '#5059C9', icon: 'users',     group: 'meet',  brandLetter: 'T' },
  { id: 'zoom',       label: 'Zoom',             color: '#2D8CFF', icon: 'camera',    group: 'meet',  brandLetter: 'Z' },
  { id: 'gmeet',      label: 'Google Meet',      color: '#00897B', icon: 'camera',    group: 'meet',  brandLetter: 'M' },
  { id: 'calendar',   label: 'Calendar',         color: '#1F8A5B', icon: 'clock',     group: 'meet',  brandLetter: 'C' },
  { id: 'linkedin',   label: 'LinkedIn',         color: '#0A66C2', icon: 'badge',     group: 'comms', brandLetter: 'L' },
  { id: 'youtube',    label: 'YouTube',          color: '#FF0000', icon: 'play',      group: 'focus', brandLetter: 'Y' },
  { id: 'spotify',    label: 'Spotify',          color: '#1DB954', icon: 'music',     group: 'focus', brandLetter: 'S' },
];

export const GROUP_LABELS: Record<SourceMeta['group'], string> = {
  work:  'Work & tickets',
  dev:   'Code & editors',
  ai:    'AI tools',
  docs:  'Docs & office',
  comms: 'Communication',
  meet:  'Meetings & calls',
  focus: 'Focus & wellbeing'
};
