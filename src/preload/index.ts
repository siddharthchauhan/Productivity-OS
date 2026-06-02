// Bridges main-process IPC handlers into the renderer as a typed `window.api`.

import { contextBridge, ipcRenderer } from 'electron';
import type { PulseAPI } from '@shared/api';

const api: PulseAPI = {
  tracker: {
    start: () => ipcRenderer.invoke('tracker:start'),
    stop: () => ipcRenderer.invoke('tracker:stop'),
    status: () => ipcRenderer.invoke('tracker:status')
  },
  today: {
    score: () => ipcRenderer.invoke('today:score'),
    metrics: () => ipcRenderer.invoke('today:metrics')
  },
  day: {
    metrics: (date) => ipcRenderer.invoke('day:metrics', date),
    score: (date) => ipcRenderer.invoke('day:score', date)
  },
  report: {
    latest: () => ipcRenderer.invoke('report:latest'),
    forDate: (date) => ipcRenderer.invoke('report:forDate', date),
    generateNow: () => ipcRenderer.invoke('report:generateNow')
  },
  suggestions: {
    open: () => ipcRenderer.invoke('sug:open'),
    history: (limit) => ipcRenderer.invoke('sug:history', limit),
    dismiss: (id) => ipcRenderer.invoke('sug:dismiss', id)
  },
  monthly: {
    latest: () => ipcRenderer.invoke('monthly:latest'),
    forMonth: (ym) => ipcRenderer.invoke('monthly:forMonth', ym),
    generateNow: (ym) => ipcRenderer.invoke('monthly:generateNow', ym)
  },
  trends: {
    week: () => ipcRenderer.invoke('trends:week'),
    improvementRate: (days) => ipcRenderer.invoke('trends:improvementRate', days)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    setAnthropicKey: (key) => ipcRenderer.invoke('settings:setKey', key),
    clearAnthropicKey: () => ipcRenderer.invoke('settings:clearKey')
  },
  classifier: {
    listOverrides: () => ipcRenderer.invoke('clf:list'),
    setOverride: (app, category, sourceId) => ipcRenderer.invoke('clf:set', app, category, sourceId)
  }
};

contextBridge.exposeInMainWorld('api', api);
