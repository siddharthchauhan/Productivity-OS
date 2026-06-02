import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Category } from '@shared/types';

// classifier.ts -> ./db/repo -> ./index -> better-sqlite3 + electron. Only
// getClassification (the user-override lookup) is reached; stub it so classify
// runs under plain Node and we can drive the override path.
const { getClassification } = vi.hoisted(() => ({ getClassification: vi.fn() }));
vi.mock('./db/repo', () => ({ getClassification }));

import { classify } from './classifier';

beforeEach(() => {
  getClassification.mockReturnValue(undefined); // no override by default
});

describe('classify', () => {
  describe('precedence', () => {
    it('lets a user override win over every rule', () => {
      getClassification.mockReturnValue({ category: 'planning', sourceId: 'jira' });
      // Cursor + a github.com title would normally classify as code/deepwork,
      // but the explicit override takes priority.
      expect(classify('Cursor', 'PR review - github.com/x')).toEqual({ category: 'planning', sourceId: 'jira' });
    });

    it('prefers a matching title rule over the app rule', () => {
      // Slack alone is comms/slack, but a github.com title routes to deepwork/github.
      expect(classify('Slack', 'PR review - github.com/x')).toMatchObject({ category: 'deepwork', sourceId: 'github' });
    });

    it('falls back to the app rule when no title rule matches', () => {
      expect(classify('Slack', 'just a window title')).toMatchObject({ category: 'comms', sourceId: 'slack' });
    });

    it('returns other for an unknown app and unmatched title', () => {
      const c = classify('SomeRandomApp', 'nothing notable here');
      expect(c.category).toBe('other');
      expect(c.sourceId).toBeUndefined();
    });

    it('matches case-insensitively', () => {
      expect(classify('SLACK')).toMatchObject({ category: 'comms', sourceId: 'slack' });
      expect(classify('cursor')).toMatchObject({ category: 'deepwork', sourceId: 'cursor' });
    });
  });

  describe('app-name rules', () => {
    it.each<[string, Category, string | undefined]>([
      ['Cursor', 'deepwork', 'cursor'],
      ['Visual Studio Code', 'deepwork', 'vscode'],
      ['Code', 'deepwork', 'vscode'], // VS Code's macOS app name
      ['IntelliJ IDEA', 'deepwork', 'vscode'],
      ['Warp', 'deepwork', undefined],
      ['Slack', 'comms', 'slack'],
      ['Microsoft Teams', 'comms', 'teams'],
      ['zoom.us', 'meetings', 'zoom'],
      ['Spotify', 'other', 'spotify'],
      ['Linear', 'planning', undefined],
      ['Notion', 'planning', undefined]
    ])('maps app "%s" to %s/%s', (app, category, sourceId) => {
      const c = classify(app);
      expect(c.category).toBe(category);
      expect(c.sourceId).toBe(sourceId);
    });

    it('does not match "Xcode" via the bare "code" alternative', () => {
      // \bcode\b has no word boundary inside "Xcode"; it hits its own rule,
      // which also maps to vscode — assert the source to lock the behavior.
      expect(classify('Xcode')).toMatchObject({ category: 'deepwork', sourceId: 'vscode' });
    });
  });

  describe('title rules (browser routing)', () => {
    it.each<[string, Category, string | undefined]>([
      ['Issue #42 · github.com/anthropics/pulse', 'deepwork', 'github'],
      ['Inbox (12) - mail.google.com', 'comms', 'gmail'],
      ['Lo-fi beats - youtube.com/watch', 'distract', 'youtube'],
      ['Feed | linkedin.com', 'distract', 'linkedin'],
      ['regex lookahead - stackoverflow', 'learning', undefined],
      ['PULSE board - atlassian', 'planning', 'jira'],
      ['New chat – claude.ai', 'deepwork', 'claudeai'],
      ['Pricing - chatgpt.com', 'deepwork', 'chatgpt']
    ])('routes browser title "%s" to %s/%s', (title, category, sourceId) => {
      const c = classify('Google Chrome', title);
      expect(c.category).toBe(category);
      expect(c.sourceId).toBe(sourceId);
    });
  });

  describe('technical vs casual YouTube', () => {
    it('classifies casual YouTube as a distraction', () => {
      expect(classify('Google Chrome', 'youtube.com/watch?v=funny-cats'))
        .toMatchObject({ category: 'distract', sourceId: 'youtube' });
    });

    it('reclassifies technical YouTube (talks, courses) as learning', () => {
      // Regression guard: the learning rule must precede the generic youtube.com
      // rule, or it is shadowed and never matches.
      const c = classify('Google Chrome', 'youtube.com/watch?v=x — Advanced TypeScript course');
      expect(c.category).toBe('learning');
      expect(c.sourceId).toBe('youtube');
    });
  });
});
