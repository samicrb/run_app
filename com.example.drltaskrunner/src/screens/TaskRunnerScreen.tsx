import React, { useEffect, useMemo, useState } from 'react';
import { LogBanner } from '../components/LogBanner';
import { detectLocale, t } from '../i18n';
import { TaskControllerService } from '../services/taskControllerService';
import { LogLine, RunnerStatus, TaskItem } from '../types/task';

const service = new TaskControllerService();

const statusColorMap: Record<RunnerStatus, string> = {
  idle: '#6b7280',
  running: '#059669',
  paused: '#d97706',
  stopped: '#b91c1c',
  error: '#dc2626'
};

const now = () => new Date().toLocaleTimeString();

export const TaskRunnerScreen: React.FC = () => {
  const locale = useMemo(detectLocale, []);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    service.getTasksFromController().then((taskList) => {
      setTasks(taskList);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: now(),
          level: 'info',
          message: `${taskList.length} task(s) loaded from controller.`
        }
      ]);
    });
  }, []);

  const pushLog = (message: string, level: 'info' | 'error' = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: now(),
        level,
        message
      }
    ]);
  };

  const onPlayPause = async () => {
    if (!selectedTask) {
      return;
    }

    try {
      if (status === 'running') {
        await service.pauseTask(selectedTask);
        setStatus('paused');
        pushLog(`Task ${selectedTask} paused.`);
        return;
      }

      if (status === 'paused') {
        await service.resumeTask(selectedTask);
        setStatus('running');
        pushLog(`Task ${selectedTask} resumed.`);
        return;
      }

      await service.playTask(selectedTask);
      setStatus('running');
      pushLog(`Task ${selectedTask} started.`);
    } catch (error) {
      setStatus('error');
      pushLog(`Action failed: ${String(error)}`, 'error');
    }
  };

  const onStop = async () => {
    if (!selectedTask || (status !== 'running' && status !== 'paused')) {
      return;
    }

    try {
      await service.stopTask(selectedTask);
      setStatus('stopped');
      pushLog(`Task ${selectedTask} stopped immediately.`);
    } catch (error) {
      setStatus('error');
      pushLog(`Stop failed: ${String(error)}`, 'error');
    }
  };

  const playLabel = status === 'running' ? t(locale, 'pause') : t(locale, 'play');
  const playDisabled = !selectedTask;
  const stopDisabled = !selectedTask || (status !== 'running' && status !== 'paused');

  return (
    <div className="task-runner-screen">
      <h1>{t(locale, 'title')}</h1>

      <div className="task-runner-screen__controls">
        <label htmlFor="task-select">{t(locale, 'selectorLabel')}</label>
        <select
          id="task-select"
          value={selectedTask}
          onChange={(event) => {
            setSelectedTask(event.target.value);
            if (status === 'stopped' || status === 'error') {
              setStatus('idle');
            }
          }}
        >
          <option value="">{t(locale, 'selectorPlaceholder')}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.name}>
              {task.name}
            </option>
          ))}
        </select>
      </div>

      <div className="task-runner-screen__actions">
        <button type="button" disabled={playDisabled} onClick={onPlayPause}>
          {status === 'paused' ? t(locale, 'play') : playLabel}
        </button>
        <button type="button" disabled={stopDisabled} onClick={onStop}>
          {t(locale, 'stop')}
        </button>
      </div>

      <div className="task-runner-screen__status">
        <span>{t(locale, 'stateLabel')}:</span>
        <strong style={{ color: statusColorMap[status] }}>{t(locale, status)}</strong>
      </div>

      <LogBanner title={t(locale, 'logs')} emptyMessage={t(locale, 'noLogs')} lines={logs} />
    </div>
  );
};
