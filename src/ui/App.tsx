import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { TuiState } from '../channels/cli.js';
import type { AppMode, ChatMessage, ToolStep, SubAgentInfo, PermissionPromptState, SidebarSection } from './types.js';
import type { PermissionMode } from '../channels/base.js';
import type { ProgrammingModeState } from '../core/programming-mode.js';
import { renderMarkdown } from '../utils/markdown.js';
import { PLAYER_CONTROLS, formatNowPlaying } from '../spotify/ui.js';
import type { SpotifyClient } from '../spotify/client.js';
import type { SubAgentStatus } from '../types/agent.js';

const MERCURY_LOGO = [
  '    __  _____________  ________  ________  __',
  '   /  |/  / ____/ __ \\/ ____/ / / / __ \\/ < /',
  '  / /|_/ / __/ / /_/ / /   / / / / /_/ /\\  / ',
  ' / /  / / /___/ _, _/ /___/ /_/ / _, _/ / /  ',
  '/_/  /_/_____/_/ |_|\\____/\\____/_/ |_| /_/   ',
];

const MERCURY_MARK = [
  '        ╭─╮   ╭─╮        ',
  '      ╭─╯ ╰───╯ ╰─╮      ',
  '    ╭─╯             ╰─╮    ',
  '   │      ●     ●      │   ',
  '   │         ◡         │   ',
  '   │                   │   ',
  '    ╰─╮             ╭─╯    ',
  '      ╰───╮   ╭───╯      ',
  '          │   │          ',
  '         ─┼───┼─         ',
  '          │   │          ',
];

const IS_LIGHT_BG = (() => {
  const fgBg = process.env.COLORFGBG;
  if (!fgBg) return false;
  const parts = fgBg.split(';');
  const bgCode = Number(parts[parts.length - 1]);
  if (Number.isNaN(bgCode)) return false;
  return bgCode >= 10;
})();

const BRAND = IS_LIGHT_BG
  ? { logo: 'blue', title: 'blue', subtitle: 'gray', accent: 'magenta' }
  : { logo: 'cyan', title: 'cyan', subtitle: 'gray', accent: 'magenta' };

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  pending: { icon: '🔵', color: 'blue' },
  running: { icon: '🟢', color: 'green' },
  paused: { icon: '🟡', color: 'yellow' },
  completed: { icon: '✅', color: 'green' },
  failed: { icon: '❌', color: 'red' },
  halted: { icon: '⛔', color: 'red' },
};

export interface TuiAppProps {
  state: TuiState;
  onInput: (text: string) => void;
  onPermissionResolve: (value: string | boolean) => void;
  onExit: () => void;
  spotifyClient?: SpotifyClient | null;
}

export function TuiApp({ state, onInput, onPermissionResolve, onExit, spotifyClient }: TuiAppProps) {
  const { exit } = useApp();
  const [input, setInput] = React.useState('');
  const [permIdx, setPermIdx] = React.useState(0);
  const [menuIdx, setMenuIdx] = React.useState(0);
  const [spotifyIdx, setSpotifyIdx] = React.useState(6);
  const [splashPhase, setSplashPhase] = React.useState<'logo' | 'skills' | 'provider' | 'ready'>('logo');
  const [skillsLoaded, setSkillsLoaded] = React.useState(0);
  const [showStartupDetails, setShowStartupDetails] = React.useState(false);
  const [spotifyNow, setSpotifyNow] = React.useState('');
  

  React.useEffect(() => {
    if (state.mode !== 'splash') return;
    if (splashPhase === 'logo') {
      const t = setTimeout(() => setSplashPhase('skills'), 80);
      return () => clearTimeout(t);
    }
  }, [state.mode, splashPhase]);

  React.useEffect(() => {
    if (state.mode !== 'splash') return;
    if (splashPhase === 'skills') {
      if (skillsLoaded >= state.skills.length) {
        const t = setTimeout(() => setSplashPhase('provider'), 60);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setSkillsLoaded((i) => i + 1), 20);
      return () => clearTimeout(t);
    }
  }, [state.mode, splashPhase, skillsLoaded, state.skills.length]);

  React.useEffect(() => {
    if (state.mode !== 'splash') return;
    if (splashPhase === 'provider') {
      const t = setTimeout(() => setSplashPhase('ready'), 80);
      return () => clearTimeout(t);
    }
  }, [state.mode, splashPhase]);

  React.useEffect(() => {
    if (state.mode === 'spotify' && spotifyClient) {
      const refresh = async () => {
        try {
          const data = await spotifyClient.getCurrentlyPlaying();
          setSpotifyNow(formatNowPlaying(data));
        } catch {
          setSpotifyNow('Nothing playing');
        }
      };
      refresh();
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }
  }, [state.mode, spotifyClient]);

  useInput((ch, key) => {
    if (ch === '\u0003' || (key.ctrl && ((key as any).name === 'c' || ch?.toLowerCase?.() === 'c'))) {
      onExit();
      return;
    }

    if (state.mode === 'splash') {
      if (ch === 'd' || ch === 'D') {
        setShowStartupDetails((v) => !v);
        return;
      }
      if (!state.permissionPrompt && key.return) {
        onInput('/chat');
        return;
      }
    }

    if (state.permissionPrompt) {
      if (state.permissionPrompt.type === 'continue') {
        if (ch === 'y' || ch === 'Y') onPermissionResolve(true);
        else if (ch === 'n' || ch === 'N') onPermissionResolve(false);
        return;
      }
      if (state.permissionPrompt.type === 'ask') {
        if (key.return) onPermissionResolve('');
        return;
      }
      const options = state.permissionPrompt.options || [];
      if (key.upArrow) setPermIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow) setPermIdx((i) => Math.min(options.length - 1, i + 1));
      else if (key.return) {
        if (options[permIdx]) onPermissionResolve(options[permIdx].value);
      } else if (key.escape) {
        onPermissionResolve(state.permissionPrompt.type === 'mode' ? 'ask-me' : false);
      }
      return;
    }

    if (state.mode === 'menu') {
      if (key.upArrow) setMenuIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow) setMenuIdx((i) => Math.min(5, i + 1));
      else if (key.return) {
        const modes: AppMode[] = ['menu', 'coding', 'chat', 'spotify', 'chat', 'chat'];
        onInput('/' + modes[menuIdx]);
        setMenuIdx(0);
      }
      else if (key.escape) onInput('/chat');
      return;
    }

    if (state.mode === 'spotify') {
      if (key.upArrow) setSpotifyIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow) setSpotifyIdx((i) => Math.min(PLAYER_CONTROLS.length - 1, i + 1));
      else if (key.return) {
        const action = PLAYER_CONTROLS[spotifyIdx];
        if (action && spotifyClient && action.value !== 'exit') {
          import('../spotify/ui.js').then(({ handlePlayerAction }) => {
            handlePlayerAction(action.value, spotifyClient).then(() => {
              spotifyClient.getCurrentlyPlaying().then((data: any) => {
                setSpotifyNow(formatNowPlaying(data));
              }).catch(() => {});
            }).catch(() => {});
          });
        }
        if (action?.value === 'exit') onInput('/chat');
      } else if (key.escape) onInput('/chat');
      return;
    }

    if (state.mode === 'splash') return;

    if (key.escape) {
      if (state.mode === 'coding') {
        onInput('/chat');
      }
      return;
    }

    if (key.return) {
      const trimmed = input.trim();
      if (trimmed) {
        onInput(trimmed);
        setInput('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta) return;
    if (ch && ch.length === 1 && !key.escape) {
      setInput((prev) => prev + ch);
    }
  });

  if (state.mode === 'splash') {
    return (
      <Box flexDirection="row" flexGrow={1} paddingX={1}>
        <Box flexDirection="column" width={34} paddingRight={2}>
          {MERCURY_MARK.map((line, i) => (
            <Text key={i} color={BRAND.logo}>{line}</Text>
          ))}
          <Text bold color={BRAND.title}>MERCURY</Text>
          <Text color={BRAND.subtitle}>Your soul-driven AI agent</Text>
          <Text color="gray">{'─'.repeat(30)}</Text>
          <Text color="green">● Core {splashPhase === 'ready' ? 'ready' : 'booting'}</Text>
          <Text color={state.provider ? 'green' : 'yellow'}>{state.provider ? '●' : '◐'} Provider {state.provider ? 'ready' : 'loading'}</Text>
          <Text color={skillsLoaded >= state.skills.length ? 'green' : 'yellow'}>{skillsLoaded >= state.skills.length ? '●' : '◐'} Skills {skillsLoaded}/{state.skills.length}</Text>
          <Text color="gray">{'─'.repeat(30)}</Text>
          <Text dimColor>Press Enter to open chat</Text>
          <Text dimColor>Press D for startup details</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Text bold color="white">Session</Text>
          <Text color="gray">{'─'.repeat(56)}</Text>
          <Text>Version: <Text color="cyan">{state.version}</Text></Text>
          <Text>Provider: <Text color={BRAND.accent}>{state.provider ? `${state.provider.name} · ${state.provider.model}` : 'Detecting...'}</Text></Text>
          <Text>Mode: <Text color="yellow">Startup</Text></Text>
          {state.tokenInfo && (
            <Text>Budget: <Text color="green">{state.tokenInfo.used.toLocaleString()}/{state.tokenInfo.budget.toLocaleString()} ({state.tokenInfo.percentage}%)</Text></Text>
          )}
          <Text color="gray">{'─'.repeat(56)}</Text>
          <Text bold color="white">Capabilities</Text>
          <Text>Skills loaded: <Text color="cyan">{skillsLoaded}</Text> / {state.skills.length}</Text>
          {showStartupDetails ? (
            <Box flexDirection="column" marginTop={1}>
              {state.skills.slice(0, skillsLoaded).map((skill, i) => (
                <Text key={i} dimColor>- {skill.name}</Text>
              ))}
            </Box>
          ) : (
            <Text dimColor>Details hidden (press D)</Text>
          )}
          <Text color="gray">{'─'.repeat(56)}</Text>
          <Text>{splashPhase === 'ready' ? 'Mercury is live.' : 'Initializing Mercury...'}</Text>
          {splashPhase === 'ready' && <Text color="green">Ready. Enter to open chat.</Text>}
          {!state.provider && <Text color="yellow">Waiting for provider handshake...</Text>}
          {state.provider && <Text color="green">Provider connected.</Text>}
        </Box>
      </Box>
    );
  }

  const showInput = !state.permissionPrompt && !state.isThinking && (state.mode === 'chat' || state.mode === 'coding');

  return (
    <Box flexDirection="column" flexGrow={1}>
      <StatusBarView state={state} />
      {state.mode === 'spotify' ? <SpotifyBody activeIdx={spotifyIdx} nowPlaying={spotifyNow} /> : null}
      {state.mode === 'menu' ? <MenuBody menuIdx={menuIdx} /> : null}
      {state.mode === 'coding' ? <CodingBody state={state} /> : null}
      {state.mode === 'chat' ? (
        <ChatBody state={state} />
      ) : null}
      {state.permissionPrompt && (
        <PermPromptView prompt={state.permissionPrompt} activeIdx={permIdx} />
      )}
      {showInput && (
        <InputBox input={input} agentName={state.agentName} />
      )}
    </Box>
  );
}

function StatusBarView({ state }: { state: TuiState }) {
  const modeColor = state.programmingMode === 'execute' ? 'green' : state.programmingMode === 'plan' ? 'yellow' : 'gray';
  const modeLabel = state.programmingMode === 'off' ? '' : ` ${state.programmingMode.toUpperCase()}`;
  let tokenBar = '';
  if (state.tokenInfo) {
    const filled = Math.min(20, Math.round(state.tokenInfo.percentage / 5));
    tokenBar = `[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${state.tokenInfo.percentage}%`;
  }
  const providerBadge = state.provider ? `⚡ ${state.provider.name} · ${state.provider.model}` : '⚡ No provider';

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text color={BRAND.logo}>☿</Text>
        <Text> </Text>
        <Text bold color={BRAND.title}>MERCURY</Text>
        <Text color={BRAND.subtitle}> · Your soul-driven AI agent</Text>
      </Box>
      <Box paddingX={1} paddingBottom={0}>
        <Box flexGrow={1}>
          <Text bold color="cyan">{state.agentName}</Text>
          {state.programmingMode !== 'off' && <Text> <Text color={modeColor} bold>{modeLabel}</Text></Text>}
          {state.projectContext && <Text> <Text color="gray">|</Text> <Text color="blue">{state.projectContext}</Text></Text>}
          <Text> <Text color="gray">|</Text> <Text color="green">{state.permissionMode === 'allow-all' ? '🔓' : '🔒'}</Text></Text>
        </Box>
        <Text color="magenta">{providerBadge}</Text>
      </Box>
      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>
      {state.tokenInfo && (
        <Box paddingX={1}>
          <Text color="cyan">Tokens </Text>
          <Text>{tokenBar}</Text>
          <Text color="gray"> {state.tokenInfo.used.toLocaleString()}/{state.tokenInfo.budget.toLocaleString()}</Text>
        </Box>
      )}
    </Box>
  );
}

function ChatBody({ state }: { state: TuiState }) {
  return (
    <Box flexDirection="row" flexGrow={1}>
      {state.sidebarSections.length > 0 && <SidebarView sections={state.sidebarSections} />}
      <Box flexDirection="column" flexGrow={1}>
        <ChatMessagesView messages={state.chatMessages} agentName={state.agentName} />
        {state.toolSteps.length > 0 && <ToolStepsView steps={state.toolSteps} />}
        {state.isThinking && <Box marginTop={1} marginLeft={2}><Text dimColor>{state.agentName} is thinking...</Text></Box>}
        {state.subAgents.length > 0 && <AgentPanelView agents={state.subAgents} />}
      </Box>
    </Box>
  );
}

function CodingBody({ state }: { state: TuiState }) {
  const modeLabels: Record<ProgrammingModeState, { label: string; color: string }> = {
    off: { label: 'OFF', color: 'gray' },
    plan: { label: 'PLAN', color: 'yellow' },
    execute: { label: 'EXECUTE', color: 'green' },
  };
  const modeInfo = modeLabels[state.programmingMode];
  const fileSection = state.sidebarSections.find((s) => s.title === 'Files');

  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box flexDirection="column" width={26} paddingX={1}>
        <Text color="gray">{'─'.repeat(24)}</Text>
        <Text bold color="cyan">Workspace</Text>
        <Box marginTop={1}>
          <Text color={modeInfo.color} bold>{modeInfo.label}</Text>
          <Text> mode</Text>
        </Box>
        {state.projectContext && <Box><Text dimColor>Project: {state.projectContext}</Text></Box>}
        {fileSection && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="cyan">{fileSection.title}</Text>
            {fileSection.items.slice(0, 10).map((item, i) => (
              <Box key={i}><Text>{item.icon} </Text><Text color={item.active ? 'white' : 'gray'}>{item.label}</Text></Box>
            ))}
          </Box>
        )}
        {state.subAgents.length > 0 && <AgentPanelView agents={state.subAgents} />}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <ChatMessagesView messages={state.chatMessages} agentName={state.agentName} />
        {state.toolSteps.length > 0 && <ToolStepsView steps={state.toolSteps} />}
        {state.isThinking && <Box marginTop={1} marginLeft={2}><Text dimColor>{state.agentName} is thinking...</Text></Box>}
      </Box>
    </Box>
  );
}

function MenuBody({ menuIdx }: { menuIdx: number }) {
  const menuOptions: Array<{ label: string; mode: AppMode; icon: string }> = [
    { label: 'Status', mode: 'menu', icon: '📊' },
    { label: 'Coding Mode', mode: 'coding', icon: '💻' },
    { label: 'Memory', mode: 'chat', icon: '🧠' },
    { label: 'Spotify Player', mode: 'spotify', icon: '🎵' },
    { label: 'Permissions', mode: 'chat', icon: '🔒' },
    { label: 'Back to Chat', mode: 'chat', icon: '💬' },
  ];

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      <Text bold color="cyan">Menu</Text>
      {menuOptions.map((opt, i) => (
        <Box key={i}>
          <Text>{i === menuIdx ? '●' : '·'} </Text>
          <Text color={i === menuIdx ? 'cyan' : 'gray'}>{opt.icon} {opt.label}</Text>
        </Box>
      ))}
      <Box marginTop={1}><Text dimColor>↑↓ navigate · Enter select · Esc back</Text></Box>
    </Box>
  );
}

function SpotifyBody({ activeIdx, nowPlaying }: { activeIdx: number; nowPlaying: string }) {
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      <Box marginBottom={1} paddingX={1}>
        <Text color="green">{'─'.repeat(30)}</Text>
        <Box flexDirection="column">
          <Text bold color="green">Now Playing</Text>
          <Text>{nowPlaying || 'Nothing playing'}</Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text bold color="cyan">Controls</Text>
        {PLAYER_CONTROLS.map((control, i) => (
          <Box key={control.value}>
            <Text>{i === activeIdx ? '●' : '·'} </Text>
            <Text color={i === activeIdx ? 'green' : 'gray'}>{control.label}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}><Text dimColor>↑↓ navigate · Enter select · Esc exit player</Text></Box>
    </Box>
  );
}

function ChatMessagesView({ messages, agentName }: { messages: ChatMessage[]; agentName: string }) {
  if (messages.length === 0) return null;
  const visible = messages.slice(-200);
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {visible.map((msg) => {
        const roleColor = msg.role === 'user' ? 'yellow' : msg.role === 'system' ? 'gray' : 'cyan';
        const prefix = msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : agentName;
        const rendered = renderMarkdown(msg.content);
        return (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color={roleColor}>{prefix}:</Text>
              {msg.streaming && <Text dimColor> (streaming...)</Text>}
            </Box>
            <Box marginLeft={2} flexDirection="column">
              <Text>{rendered}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function ToolStepsView({ steps }: { steps: ToolStep[] }) {
  const visible = steps.slice(-6);
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      {visible.map((step) => (
        <Box key={step.id}>
          <Text dimColor>{step.label}</Text>
          {step.status === 'running' && <Text color="yellow"> ⠋</Text>}
          {step.status === 'done' && step.elapsed != null && <Text dimColor> ({step.elapsed.toFixed(1)}s)</Text>}
          {step.status === 'done' && step.result && <Text dimColor> · {step.result}</Text>}
          {step.status === 'error' && <Text color="red"> ✗</Text>}
        </Box>
      ))}
    </Box>
  );
}

function AgentPanelView({ agents }: { agents: SubAgentInfo[] }) {
  if (agents.length === 0) return null;
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Text color="gray">{'─'.repeat(30)}</Text>
      <Text bold color="cyan">Agents</Text>
      {agents.map((agent) => {
        const cfg = STATUS_ICONS[agent.status] || STATUS_ICONS.pending;
        const elapsed = ((Date.now() - agent.startedAt) / 1000).toFixed(0);
        const taskPreview = agent.task.length > 40 ? agent.task.slice(0, 37) + '...' : agent.task;
        return (
          <Box key={agent.id} flexDirection="column">
            <Box><Text>{cfg.icon} </Text><Text bold color={cfg.color}>{agent.id}</Text><Text dimColor> {taskPreview}</Text></Box>
            <Box marginLeft={3}><Text dimColor>{agent.status} · {elapsed}s</Text></Box>
          </Box>
        );
      })}
    </Box>
  );
}

function SidebarView({ sections }: { sections: SidebarSection[] }) {
  if (sections.length === 0) return null;
  return (
    <Box flexDirection="column" width={24} paddingX={1}>
      <Text color="gray">{'─'.repeat(22)}</Text>
      {sections.map((section, si) => (
        <Box key={si} flexDirection="column" marginBottom={si < sections.length - 1 ? 1 : 0}>
          <Text bold color="cyan">{section.title}</Text>
          {section.items.map((item, ii) => (
            <Box key={ii}><Text>{item.icon} </Text><Text color={item.active ? 'white' : 'gray'}>{item.label}</Text></Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function PermPromptView({ prompt, activeIdx }: { prompt: PermissionPromptState; activeIdx: number }) {
  const options = prompt.options || [];

  if (prompt.type === 'continue') {
    return (
      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Box><Text color="yellow">⚠ </Text><Text>{prompt.message}</Text></Box>
        <Text dimColor>  [y/N]</Text>
      </Box>
    );
  }

  if (prompt.type === 'ask') {
    return (
      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Box><Text color="yellow">⚠ </Text><Text>{prompt.message}</Text></Box>
        <Text dimColor>  Type your answer and press Enter</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Box><Text bold color="yellow">⚠ {prompt.message}</Text></Box>
      {options.map((opt, i) => (
        <Box key={opt.value}>
          <Text>{i === activeIdx ? '●' : '·'} </Text>
          <Text color={i === activeIdx ? 'cyan' : 'gray'}>{opt.label}</Text>
        </Box>
      ))}
      <Text dimColor>  ↑↓ to navigate, Enter to select</Text>
    </Box>
  );
}

function InputBox({ input, agentName }: { input: string; agentName: string }) {
  return (
    <Box flexDirection="column">
      <Text color="dim">{'─'.repeat(60)}</Text>
      <Box paddingX={1}>
        <Text color="yellow" bold>{'>'} </Text>
        <Text>{input}</Text>
        <Text dimColor>█</Text>
      </Box>
    </Box>
  );
}
