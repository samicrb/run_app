import React from 'react';
import { LogLine } from '../types/task';

interface LogBannerProps {
  title: string;
  emptyMessage: string;
  lines: LogLine[];
}

export const LogBanner: React.FC<LogBannerProps> = ({ title, emptyMessage, lines }) => {
  return (
    <section className="log-banner" aria-label={title}>
      <div className="log-banner__title">{title}</div>
      <div className="log-banner__content">
        {lines.length === 0 ? (
          <p className="log-banner__empty">{emptyMessage}</p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className={`log-banner__line log-banner__line--${line.level}`}>
              [{line.timestamp}] {line.message}
            </p>
          ))
        )}
      </div>
    </section>
  );
};
