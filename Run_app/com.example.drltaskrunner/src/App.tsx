/*
    BSD 3-Clause License
    Copyright (c) 2023, Doosan Robotics Inc.
*/
import {
  Context,
  IProgramManager,
  ModuleContext,
  ProgramState,
  ProgramStopType,
} from 'dart-api';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './assets/styles/styles.module.scss';

interface IAppProps {
  moduleContext: ModuleContext;
}

type UiExecutionState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

const MAX_LOG_ITEMS = 150;

async function getTasksFromController(_: ModuleContext): Promise<string[]> {
  // NOTE:
  // SDK5 Dart API in this starter does not expose an API to list controller task files directly.
  // This adapter keeps the UI ready and can be replaced later by your project-specific source.
  return ['Task_08042026', 'Task_09042026', 'Task_10042026'];
}

function buildDrlFromTaskName(taskName: string): string {
  // Minimal generated script. Replace this body with your real DRL task launcher command
  // if your controller workflow requires another DRL entrypoint.
  return [
    'def __module_run_selected_task():',
    `    tp_log("[TaskRunner] Selected task: ${taskName}")`,
    '    tp_log("[TaskRunner] Execute your task call here.")',
    '__module_run_selected_task()',
  ].join('\n');
}

function toUiState(programState: number): UiExecutionState {
  if (programState === ProgramState.PLAY) {
    return 'RUNNING';
  }
  if (programState === ProgramState.HOLD) {
    return 'PAUSED';
  }
  if (
    programState === ProgramState.STOP ||
    programState === ProgramState.CANCELLED
  ) {
    return 'STOPPED';
  }
  return 'IDLE';
}

function App(props: IAppProps) {
  const { moduleContext } = props;
  const { t } = useTranslation(moduleContext.packageName);

  const [tasks, setTasks] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [executionState, setExecutionState] =
    useState<UiExecutionState>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const programManager = useMemo(
    () =>
      moduleContext.getSystemManager(
        Context.PROGRAM_MANAGER,
      ) as IProgramManager,
    [moduleContext],
  );

  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      try {
        const nextTasks = await getTasksFromController(moduleContext);
        if (!isMounted) {
          return;
        }
        setTasks(nextTasks);
        if (nextTasks.length > 0) {
          setSelectedTask((prev) => (prev !== '' ? prev : nextTasks[0]));
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setExecutionState('ERROR');
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setStatusMessage(t('taskLoadError', { error: errorMessage }));
      }
    };

    const onProgramState = (value: number) => {
      setExecutionState(toUiState(value));
    };
    const onProgramLog = (value: string) => {
      setLogs((prev) => [value, ...prev].slice(0, MAX_LOG_ITEMS));
    };

    fetchTasks();
    programManager.programState.register(moduleContext, onProgramState, true);
    programManager.userLog.register(moduleContext, onProgramLog);

    return () => {
      isMounted = false;
      programManager.programState.unregister(moduleContext, onProgramState);
      programManager.userLog.unregister(moduleContext, onProgramLog);
    };
  }, [moduleContext, programManager, t]);

  const addUiLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, MAX_LOG_ITEMS));
  };

  const handlePlayPause = async () => {
    if (selectedTask === '') {
      return;
    }

    try {
      if (executionState === 'RUNNING') {
        const paused = await programManager.pauseProgram();
        if (!paused) {
          throw new Error(t('pauseFailed'));
        }
        addUiLog(t('pausedByOperator'));
        setExecutionState('PAUSED');
        return;
      }

      if (executionState === 'PAUSED') {
        const resumed = await programManager.resumeProgram();
        if (!resumed) {
          throw new Error(t('resumeFailed'));
        }
        addUiLog(t('resumedByOperator'));
        setExecutionState('RUNNING');
        return;
      }

      const script = buildDrlFromTaskName(selectedTask);
      const started = await programManager.runProgram(
        script,
        null,
        null,
        false,
      );
      if (!started) {
        throw new Error(t('startFailed'));
      }
      addUiLog(t('startedTask', { task: selectedTask }));
      setExecutionState('RUNNING');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setExecutionState('ERROR');
      setStatusMessage(t('runtimeError', { error: errorMessage }));
      addUiLog(t('runtimeError', { error: errorMessage }));
    }
  };

  const handleStop = async () => {
    try {
      const stopped = await programManager.stopProgram(ProgramStopType.QUICK);
      if (!stopped) {
        throw new Error(t('stopFailed'));
      }
      addUiLog(t('stoppedByOperator'));
      setExecutionState('STOPPED');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setExecutionState('ERROR');
      setStatusMessage(t('runtimeError', { error: errorMessage }));
      addUiLog(t('runtimeError', { error: errorMessage }));
    }
  };

  const onTaskChange = (event: SelectChangeEvent<string>) => {
    setSelectedTask(event.target.value);
  };

  const isTaskSelected = selectedTask !== '';
  const canPlayPause = isTaskSelected && executionState !== 'ERROR';
  const canStop =
    isTaskSelected &&
    (executionState === 'RUNNING' || executionState === 'PAUSED');
  let playPauseLabel = t('play');
  if (executionState === 'RUNNING') {
    playPauseLabel = t('pause');
  } else if (executionState === 'PAUSED') {
    playPauseLabel = t('resume');
  }

  return (
    <Box className={styles['process-container']}>
      <Stack spacing={2} className={styles['top-section']}>
        <Typography variant="h6">{t('title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel id="task-select-label">{t('taskLabel')}</InputLabel>
          <Select
            labelId="task-select-label"
            value={selectedTask}
            label={t('taskLabel')}
            onChange={onTaskChange}
          >
            {tasks.map((task) => (
              <MenuItem key={task} value={task}>
                {task}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          className={styles['state-row']}
        >
          <Typography variant="body2">{t('stateLabel')}</Typography>
          <Alert
            severity={executionState === 'ERROR' ? 'error' : 'info'}
            className={styles['state-chip']}
          >
            {t(`state.${executionState.toLowerCase()}`)}
          </Alert>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            disabled={!canPlayPause}
            onClick={handlePlayPause}
          >
            {playPauseLabel}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!canStop}
            onClick={handleStop}
          >
            {t('stop')}
          </Button>
        </Stack>

        {statusMessage !== '' && (
          <Alert severity="error">{statusMessage}</Alert>
        )}
      </Stack>

      <Box className={styles['log-panel']}>
        <Typography variant="subtitle2" className={styles['log-title']}>
          {t('logsTitle')}
        </Typography>
        <Box className={styles['log-list']}>
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('noLogs')}
            </Typography>
          ) : (
            logs.map((log, index) => (
              <Typography
                key={`${log}-${index}`}
                variant="caption"
                className={styles['log-item']}
              >
                {log}
              </Typography>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default App;
