// Maps an active-window observation (app name + window title) to:
//   • a Pulse `category` — drives the time-allocation pie + score
//   • a `sourceId` — maps to one of the 22 source widgets on the dashboard
//
// This is the single most personal piece of the app. The defaults below are a
// reasonable engineer-focused baseline; you can override any app via the
// in-app "Classifier overrides" panel, which writes to the `classifications` table.

import type { Category } from '@shared/types';
import { getClassification } from './db/repo';

interface Classification {
  category: Category;
  sourceId?: string;
}

// ---------- baseline rules (case-insensitive substring match on app name) ----------
const APP_RULES: Array<{ match: RegExp; category: Category; sourceId?: string }> = [
  // Code & editors  → deep work
  { match: /\b(cursor)\b/i,                category: 'deepwork', sourceId: 'cursor' },
  { match: /\b(visual studio code|vscode|code-insiders|vscodium)\b/i, category: 'deepwork', sourceId: 'vscode' },
  { match: /\b(xcode|android studio|intellij|webstorm|pycharm|rubymine|goland)\b/i, category: 'deepwork', sourceId: 'vscode' },
  { match: /\b(terminal|iterm2?|warp|alacritty|hyper|kitty|tabby)\b/i, category: 'deepwork' },
  { match: /\b(sublime text|nova|zed|neovim|nvim|vim|emacs)\b/i, category: 'deepwork', sourceId: 'vscode' },

  // AI tools — "leverage" bucket, but time spent here counts as deep work for now
  { match: /\b(claude)\b/i,                category: 'deepwork', sourceId: 'claudeai' },
  { match: /\b(chatgpt|openai)\b/i,        category: 'deepwork', sourceId: 'chatgpt' },
  { match: /\b(github copilot)\b/i,        category: 'deepwork', sourceId: 'copilot' },

  // Comms
  { match: /\b(slack)\b/i,                 category: 'comms',    sourceId: 'slack' },
  { match: /\b(microsoft teams|teams)\b/i, category: 'comms',    sourceId: 'teams' },
  { match: /\b(outlook|microsoft outlook|mail \(outlook\))\b/i, category: 'comms', sourceId: 'outlook' },
  { match: /\b(mail|airmail|spark|superhuman|hey)\b/i, category: 'comms', sourceId: 'gmail' },
  { match: /\b(discord)\b/i,               category: 'comms' },
  { match: /\b(linear|asana|height|trello)\b/i, category: 'planning' },

  // Meetings
  { match: /\b(zoom|zoom\.us)\b/i,         category: 'meetings', sourceId: 'zoom' },
  { match: /\b(google meet|meet\.google\.com)\b/i, category: 'meetings', sourceId: 'gmeet' },
  { match: /\b(facetime|webex|whereby)\b/i, category: 'meetings' },

  // Office / docs
  { match: /\b(microsoft excel|excel)\b/i, category: 'planning', sourceId: 'excel' },
  { match: /\b(microsoft word|word)\b/i,   category: 'planning', sourceId: 'word' },
  { match: /\b(microsoft powerpoint|powerpoint|keynote)\b/i, category: 'planning', sourceId: 'powerpoint' },
  { match: /\b(notion|obsidian|bear|craft|logseq|roam)\b/i, category: 'planning' },
  { match: /\b(figma|sketch|adobe)\b/i,    category: 'deepwork' },

  // Browser — depends entirely on the window title (handled below)
  { match: /\b(safari|google chrome|chrome|arc|brave|firefox|edge)\b/i, category: 'other' },

  // Distractions
  { match: /\b(youtube)\b/i,               category: 'distract', sourceId: 'youtube' },
  { match: /\b(netflix|hulu|disney|prime video|hbo|twitch)\b/i, category: 'distract' },
  { match: /\b(twitter|x \(twitter\)|instagram|tiktok|facebook|reddit)\b/i, category: 'distract' },
  { match: /\b(messages|whatsapp|telegram|signal)\b/i, category: 'distract' },
  { match: /\b(spotify|music)\b/i,         category: 'other',    sourceId: 'spotify' },
];

// Browsers route through window-title rules, because "Chrome on github.com" is
// deep work and "Chrome on youtube.com" is a distraction.
const TITLE_RULES: Array<{ match: RegExp; category: Category; sourceId?: string }> = [
  { match: /\bgithub\.com\b/i,             category: 'deepwork', sourceId: 'github' },
  { match: /\bgitlab\.com\b/i,             category: 'deepwork', sourceId: 'github' },
  { match: /\bjira|atlassian\b/i,          category: 'planning', sourceId: 'jira' },
  { match: /\blinear\.app\b/i,             category: 'planning' },
  { match: /\bclaude\.ai\b/i,              category: 'deepwork', sourceId: 'claudeai' },
  { match: /\bchatgpt\.com|chat\.openai\.com\b/i, category: 'deepwork', sourceId: 'chatgpt' },
  { match: /\bgoogle docs|docs\.google\b/i, category: 'planning' },
  { match: /\bmail\.google\.com|gmail\b/i, category: 'comms',    sourceId: 'gmail' },
  { match: /\blinkedin\.com\b/i,           category: 'distract', sourceId: 'linkedin' },
  { match: /\byoutube\.com\b/i,            category: 'distract', sourceId: 'youtube' },
  { match: /\b(twitter|x)\.com\b/i,        category: 'distract' },
  { match: /\b(reddit|instagram|tiktok|facebook)\.com\b/i, category: 'distract' },
  // Reclassify "technical" YouTube as learning (chat decision from the design phase).
  { match: /\byoutube\.com.*(tutorial|conf|talk|lecture|course|guide)\b/i, category: 'learning', sourceId: 'youtube' },
  { match: /\b(stackoverflow|mdn|developer\.mozilla|readthedocs)\b/i, category: 'learning' },
];

export function classify(appName: string, title?: string): Classification {
  // 1) explicit user override always wins
  const override = getClassification(appName);
  if (override) return override;

  // 2) title-based rule (useful for browsers and Electron apps that share names)
  if (title) {
    for (const r of TITLE_RULES) {
      if (r.match.test(title)) return { category: r.category, sourceId: r.sourceId };
    }
  }

  // 3) app-name rule
  for (const r of APP_RULES) {
    if (r.match.test(appName)) return { category: r.category, sourceId: r.sourceId };
  }

  // 4) unknown app → 'other' so it shows up in time but doesn't bias the score
  return { category: 'other' };
}
