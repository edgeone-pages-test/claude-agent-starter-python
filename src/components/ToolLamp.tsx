import type { ToolLampState } from '../types';
import styles from './ToolLamp.module.css';

interface Props {
  lamp: ToolLampState;
}

export default function ToolLamp({ lamp }: Props) {
  return (
    <div className={`${styles.lamp} ${lamp.active ? styles.active : ''}`}>
      {/* key=animKey 让 span 在每次点亮时重新挂载，确保 CSS animation 从头播放 */}
      <span key={lamp.animKey} className={styles.icon}>{lamp.icon}</span>
      <span className={styles.label}>{lamp.label}</span>
    </div>
  );
}
