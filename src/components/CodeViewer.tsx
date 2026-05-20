import type React from 'react';
import styles from './CodeViewer.module.css';

/* -- Tiny inline helpers -- */
const Cmt  = ({ t }: { t: string }) => <span className={styles.cmt}>{t}</span>;
const Kw   = ({ t }: { t: string }) => <span className={styles.kw}>{t}</span>;
const Fn   = ({ t }: { t: string }) => <span className={styles.fn}>{t}</span>;
const Str  = ({ t }: { t: string }) => <span className={styles.str}>{t}</span>;
const Doc  = ({ t }: { t: string }) => <span className={styles.doc}>{t}</span>;
const Op   = ({ t }: { t: string }) => <span className={styles.op}>{t}</span>;
const Va   = ({ t }: { t: string }) => <span className={styles.va}>{t}</span>;

interface LineProps { n: number; children?: React.ReactNode }
const L = ({ n, children }: LineProps) => (
  <div className={styles.line}>
    <span className={styles.ln}>{String(n).padStart(2, ' ')}</span>
    <span className={styles.lc}>{children ?? ' '}</span>
  </div>
);

const I = ({ level = 1 }: { level?: number }) => (
  <>{Array.from({ length: level }).map((_, i) => (
    <span key={i} className={styles.indent} />
  ))}</>
);

export default function CodeViewer() {
  return (
    <div className={styles.panel}>
      {/* -- Header -- */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.fileIcon}>&#x2B21;</span>
          <span className={styles.filename}>tools<span className={styles.sep}>.</span>ts</span>
        </div>
        <span className={styles.badge}>READ ONLY</span>
      </div>

      {/* -- Code body -- */}
      <div className={styles.body}>
        <div className={styles.scanline} aria-hidden />

        <div className={styles.code}>
          <L n={1}><Cmt t="// ========== EdgeOne 平台沙箱工具接入 ==========" /></L>
          <L n={2}>
            <Kw t="import " /><Op t="{ " />
            <Va t="tool" /><Op t=", " />
            <Va t="createSdkMcpServer" />
            <Op t=" } " /><Kw t="from " /><Str t="'claude-agent-sdk'" />
          </L>
          <L n={3} />

          <L n={4}><Cmt t="// 从 EdgeOne context 获取平台工具" /></L>
          <L n={5}>
            <Kw t="const " /><Va t="rawTools" /><Op t=" = " />
            <Va t="context" /><Op t="." /><Va t="tools" /><Op t="." />
            <Fn t="all" /><Op t="()" />
          </L>
          <L n={6} />

          <L n={7}><Cmt t="// 定义 4 个 MCP 工具，桥接平台实现" /></L>
          <L n={8}>
            <Kw t="const " /><Va t="commandsTool" /><Op t=" = " />
            <Fn t="tool" /><Op t="(" />
          </L>
          <L n={9}>
            <I /><Str t="'commands'" /><Op t="," />
            <Op t="  " /><Cmt t="// 终端命令" />
          </L>
          <L n={10}>
            <I /><Str t="'Execute shell commands'" /><Op t="," />
          </L>
          <L n={11}>
            <I /><Op t="{ " /><Va t="cmd" /><Op t=": " />
            <Fn t="z.string" /><Op t="() }," />
          </L>
          <L n={12}>
            <I /><Op t="(" /><Va t="args" /><Op t=") => " />
            <Fn t="callPlatformTool" /><Op t="(" />
            <Str t="'commands'" /><Op t=", " /><Va t="args" /><Op t=")" />
          </L>
          <L n={13}><Op t=")" /></L>
          <L n={14} />

          <L n={15}>
            <Kw t="const " /><Va t="filesTool" /><Op t=" = " />
            <Fn t="tool" /><Op t="(" />
          </L>
          <L n={16}>
            <I /><Str t="'files'" /><Op t="," />
            <Op t="     " /><Cmt t="// 文件操作" />
          </L>
          <L n={17}>
            <I /><Str t="'File read/write/list operations'" /><Op t="," />
          </L>
          <L n={18}>
            <I /><Op t="{ " /><Va t="op" /><Op t=": " />
            <Fn t="z.enum" /><Op t="([" /><Str t="'read'" /><Op t=", " />
            <Str t="'write'" /><Op t=", " /><Str t="'list'" /><Op t=", ...])," />
          </L>
          <L n={19}>
            <I /><Op t="  " /><Va t="path" /><Op t=": " />
            <Fn t="z.string" /><Op t="()," />
            <Op t=" " /><Va t="content" /><Op t=": " />
            <Fn t="z.string" /><Op t="()." /><Fn t="optional" /><Op t="() }" />
          </L>
          <L n={20}><Op t=")" /></L>
          <L n={21} />

          <L n={22}>
            <Kw t="const " /><Va t="codeTool" /><Op t=" = " />
            <Fn t="tool" /><Op t="(" />
          </L>
          <L n={23}>
            <I /><Str t="'code_interpreter'" /><Op t="," />
            <Cmt t=" // 代码解释器" />
          </L>
          <L n={24}>
            <I /><Op t="{ " /><Va t="language" /><Op t=": " />
            <Fn t="z.string" /><Op t="()," />
            <Op t=" " /><Va t="code" /><Op t=": " />
            <Fn t="z.string" /><Op t="() }" />
          </L>
          <L n={25}><Op t=")" /></L>
          <L n={26} />

          <L n={27}>
            <Kw t="const " /><Va t="browserTool" /><Op t=" = " />
            <Fn t="tool" /><Op t="(" />
          </L>
          <L n={28}>
            <I /><Str t="'browser'" /><Op t="," />
            <Op t="    " /><Cmt t="// 浏览器操作" />
          </L>
          <L n={29}>
            <I /><Op t="{ " /><Va t="op" /><Op t=": " />
            <Fn t="z.enum" /><Op t="([" /><Str t="'fetch'" /><Op t=", " />
            <Str t="'screenshot'" /><Op t=", ...])," />
          </L>
          <L n={30}>
            <I /><Op t="  " /><Va t="url" /><Op t=": " />
            <Fn t="z.string" /><Op t="()." /><Fn t="optional" /><Op t="() }" />
          </L>
          <L n={31}><Op t=")" /></L>
          <L n={32} />

          <L n={33}><Cmt t="// 注册为 MCP Server" /></L>
          <L n={34}>
            <Kw t="const " /><Va t="mcpServer" /><Op t=" = " />
            <Fn t="createSdkMcpServer" /><Op t="({" />
          </L>
          <L n={35}>
            <I /><Va t="name" /><Op t=": " /><Str t="'edgeone-sandbox'" /><Op t="," />
          </L>
          <L n={36}>
            <I /><Va t="tools" /><Op t=": [" />
            <Va t="commandsTool" /><Op t=", " />
            <Va t="filesTool" /><Op t=", " />
            <Va t="codeTool" /><Op t=", " />
            <Va t="browserTool" /><Op t="]" />
          </L>
          <L n={37}><Op t="})" /></L>
          <L n={38} />
          <L n={39}><Doc t='// Handler 内部桥接 context.tools 执行 EdgeOne 平台沙箱操作' /></L>
        </div>
      </div>

      {/* -- Footer tag -- */}
      <div className={styles.footer}>
        <span className={styles.footerDot} />
        <span>Claude Agent SDK + EdgeOne Sandbox Tools</span>
      </div>
    </div>
  );
}
