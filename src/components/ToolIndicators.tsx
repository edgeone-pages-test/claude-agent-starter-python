import type { ToolLampState } from '../types';
import ToolLamp from './ToolLamp';
import styles from './ToolIndicators.module.css';

interface Props {
  lamps: ToolLampState[];
}

export default function ToolIndicators({ lamps }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        {lamps.map(lamp => (
          <ToolLamp key={lamp.id} lamp={lamp} />
        ))}
      </div>
      <p className={styles.hint}>EdgeOne 平台沙箱工具 · 调用时实时点亮</p>
    </div>
  );
}
