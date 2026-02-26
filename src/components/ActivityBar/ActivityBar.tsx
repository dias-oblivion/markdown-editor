import { Icon } from '@iconify/react';
import styles from './ActivityBar.module.css';

interface ActivityBarProps {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export function ActivityBar({ sidebarVisible, onToggleSidebar }: ActivityBarProps) {
  return (
    <div className={styles.activityBar}>
      <button
        className={`${styles.activityButton} ${sidebarVisible ? styles.active : ''}`}
        onClick={onToggleSidebar}
        data-tooltip="Explorer (Ctrl+B)"
        title="Explorer"
      >
        <Icon icon="codicon:files" width={24} />
      </button>
    </div>
  );
}
