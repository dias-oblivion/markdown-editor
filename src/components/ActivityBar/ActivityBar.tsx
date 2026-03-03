import { Icon } from '@iconify/react';
import styles from './ActivityBar.module.css';

interface ActivityBarProps {
  sidebarVisible: boolean;
  settingsOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export function ActivityBar({ sidebarVisible, settingsOpen, onToggleSidebar, onOpenSettings }: ActivityBarProps) {
  return (
    <div className={styles.activityBar}>
      <button
        className={`${styles.activityButton} ${sidebarVisible && !settingsOpen ? styles.active : ''}`}
        onClick={onToggleSidebar}
        data-tooltip="Explorer (Ctrl+B)"
        title="Explorer"
      >
        <Icon icon="codicon:files" width={24} />
      </button>

      <div className={styles.bottomSection}>
        <button
          className={`${styles.activityButton} ${settingsOpen ? styles.active : ''}`}
          onClick={onOpenSettings}
          data-tooltip="Settings"
          title="Settings"
        >
          <Icon icon="codicon:gear" width={24} />
        </button>
      </div>
    </div>
  );
}
