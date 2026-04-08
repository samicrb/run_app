export type RunnerStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export interface TaskItem {
  id: string;
  name: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'error';
  message: string;
}
