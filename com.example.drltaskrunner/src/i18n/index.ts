export type Locale = 'fr' | 'en';

const dictionary = {
  fr: {
    title: 'Exécuteur de tâches DRL',
    selectorLabel: 'Tâche DRL',
    selectorPlaceholder: 'Sélectionner une tâche',
    stateLabel: 'État',
    idle: 'Inactif',
    running: 'En cours',
    paused: 'En pause',
    stopped: 'Arrêté',
    error: 'Erreur',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    logs: 'Journal',
    noLogs: 'Aucun log pour le moment.'
  },
  en: {
    title: 'DRL Task Runner',
    selectorLabel: 'DRL task',
    selectorPlaceholder: 'Select a task',
    stateLabel: 'State',
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    stopped: 'Stopped',
    error: 'Error',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    logs: 'Logs',
    noLogs: 'No logs yet.'
  }
} as const;

export type TranslationKey = keyof (typeof dictionary)['fr'];

export const detectLocale = (): Locale => {
  const language = navigator.language.toLowerCase();
  return language.startsWith('fr') ? 'fr' : 'en';
};

export const t = (locale: Locale, key: TranslationKey): string => dictionary[locale][key];
