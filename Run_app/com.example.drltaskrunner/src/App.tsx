/*
    BSD 3-Clause License
    Copyright (c) 2023, Doosan Robotics Inc.
*/
import {
  Context,
  FileHandler,
  IFilePicker,
  IProgramManager,
  IRobotManager,
  ModuleContext,
  ProgramState,
  ProgramStopType,
  RobotMode,
} from 'dart-api';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import {
  Alert,
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './assets/styles/styles.module.scss';

interface IAppProps {
  moduleContext: ModuleContext;
}

type UiExecutionState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

type DiagnosticCode =
  | 'OK'
  | 'SERVO_OFF'
  | 'NOT_AUTO_MODE'
  | 'SERVO_OFF_AND_NOT_AUTO_MODE'
  | 'NO_TASK_SELECTED';

interface TaskItem {
  name: string;
  handler: FileHandler;
}

const MAX_LOG_ITEMS = 150;
const CONTROL_BUTTON_SIZE = 88;

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

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [executionState, setExecutionState] =
    useState<UiExecutionState>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [diagnosticCode, setDiagnosticCode] =
    useState<DiagnosticCode>('NO_TASK_SELECTED');
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const programManager = useMemo(
    () =>
      moduleContext.getSystemManager(
        Context.PROGRAM_MANAGER,
      ) as IProgramManager,
    [moduleContext],
  );

  const robotManager = useMemo(
    () =>
      moduleContext.getSystemManager(Context.ROBOT_MANAGER) as IRobotManager,
    [moduleContext],
  );

  const filePicker = useMemo(
    () => moduleContext.getSystemLibrary(Context.FILE_PICKER) as IFilePicker,
    [moduleContext],
  );

  useEffect(() => {
    const onProgramState = (value: number) => {
      setExecutionState(toUiState(value));
    };
    const onProgramLog = (value: string) => {
      setLogs((prev) => [value, ...prev].slice(0, MAX_LOG_ITEMS));
    };

    programManager.programState.register(moduleContext, onProgramState, true);
    programManager.userLog.register(moduleContext, onProgramLog);

    return () => {
      programManager.programState.unregister(moduleContext, onProgramState);
      programManager.userLog.unregister(moduleContext, onProgramLog);
    };
  }, [moduleContext, programManager]);

  useEffect(() => {
    if (selectedTask === '') {
      setDiagnosticCode('NO_TASK_SELECTED');
    }
  }, [selectedTask]);

  const addUiLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, MAX_LOG_ITEMS));
  };

  const refreshTasksFromController = async () => {
    setStatusMessage('');
    setIsLoadingTasks(true);
    try {
      const pickResult = await filePicker.showFilePicker({
        multiple: true,
        types: [
          {
            mimeType: 'text/plain',
            extensions: ['.drl'],
          },
        ],
      });

      if (!pickResult.handlers || pickResult.handlers.length === 0) {
        setStatusMessage(t('taskPickerCancelled'));
        return;
      }

      const nextTasks = pickResult.handlers.map((handler) => ({
        name: handler.name.replace(/\.drl$/i, ''),
        handler,
      }));
      nextTasks.sort((a, b) => a.name.localeCompare(b.name));

      setTasks(nextTasks);
      setSelectedTask(nextTasks[0]?.name ?? '');
      addUiLog(t('tasksLoaded', { count: nextTasks.length }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setExecutionState('ERROR');
      setStatusMessage(t('taskLoadError', { error: errorMessage }));
      addUiLog(t('taskLoadError', { error: errorMessage }));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const runPreflightDiagnostic = async (): Promise<DiagnosticCode> => {
    if (selectedTask === '') {
      return 'NO_TASK_SELECTED';
    }

    const isServoOn = robotManager.isServoOn();
    const robotMode = await robotManager.getRobotMode();
    const isAutoMode = robotMode === RobotMode.AUTONOMOUS;

    if (!isServoOn && !isAutoMode) {
      return 'SERVO_OFF_AND_NOT_AUTO_MODE';
    }
    if (!isServoOn) {
      return 'SERVO_OFF';
    }
    if (!isAutoMode) {
      return 'NOT_AUTO_MODE';
    }

    return 'OK';
  };

  const handlePlayPause = async () => {
    setStatusMessage('');
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

      const preflight = await runPreflightDiagnostic();
      setDiagnosticCode(preflight);
      if (preflight !== 'OK') {
        const msg = t(`diagnostic.${preflight.toLowerCase()}`);
        setStatusMessage(msg);
        addUiLog(msg);
        return;
      }

      const task = tasks.find((item) => item.name === selectedTask);
      if (!task) {
        setDiagnosticCode('NO_TASK_SELECTED');
        return;
      }

      const fileReadResult = await task.handler.read();
      if (!fileReadResult.data) {
        throw new Error(t('taskReadFailed', { task: selectedTask }));
      }

      const started = await programManager.runProgram(
        fileReadResult.data,
        null,
        null,
        false,
      );
      if (!started) {
        throw new Error(t('startFailed'));
      }

      setDiagnosticCode('OK');
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
    setStatusMessage('');
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

  const playPauseIcon =
    executionState === 'RUNNING' ? (
      <PauseIcon fontSize="large" />
    ) : (
      <PlayArrowIcon fontSize="large" />
    );

  return (
    <Box className={styles['process-container']}>
      <Stack spacing={2} className={styles['top-section']}>
        <Typography variant="h6">{t('title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl fullWidth size="small">
            <InputLabel id="task-select-label">{t('taskLabel')}</InputLabel>
            <Select
              labelId="task-select-label"
              value={selectedTask}
              label={t('taskLabel')}
              onChange={onTaskChange}
            >
              {tasks.map((task) => (
                <MenuItem key={task.name} value={task.name}>
                  {task.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title={t('refreshTasks')}>
            <span>
              <IconButton
                color="primary"
                onClick={refreshTasksFromController}
                disabled={isLoadingTasks}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

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

        <Alert severity={diagnosticCode === 'OK' ? 'success' : 'warning'}>
          {t(`diagnostic.${diagnosticCode.toLowerCase()}`)}
        </Alert>

        <Stack direction="row" spacing={2}>
          <IconButton
            color="primary"
            className={styles['control-button']}
            onClick={handlePlayPause}
            disabled={!canPlayPause}
            aria-label={t('playPauseAria')}
            sx={{ width: CONTROL_BUTTON_SIZE, height: CONTROL_BUTTON_SIZE }}
          >
            {playPauseIcon}
          </IconButton>

          <IconButton
            color="error"
            className={styles['control-button']}
            onClick={handleStop}
            disabled={!canStop}
            aria-label={t('stop')}
            sx={{ width: CONTROL_BUTTON_SIZE, height: CONTROL_BUTTON_SIZE }}
          >
            <StopIcon fontSize="large" />
          </IconButton>
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
