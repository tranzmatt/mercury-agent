import React from 'react';
import { render } from 'ink';
import type { ChannelMessage } from '../types/channel.js';
import { BaseChannel, type PermissionMode } from './base.js';
import { logger } from '../utils/logger.js';
import { formatToolStep, formatToolResult } from '../utils/tool-label.js';
import type { ChatMessage, ToolStep, PermissionPromptState, SidebarSection, SkillInfo, SubAgentInfo, ProviderInfo, TokenInfo, AppMode } from '../ui/types.js';
import { TuiApp } from '../ui/App.js';

export interface TuiState {
  mode: AppMode;
  chatMessages: ChatMessage[];
  toolSteps: ToolStep[];
  isThinking: boolean;
  permissionPrompt: PermissionPromptState | null;
  agentName: string;
  version: string;
  provider: ProviderInfo | null;
  tokenInfo: TokenInfo | null;
  skills: SkillInfo[];
  subAgents: SubAgentInfo[];
  sidebarSections: SidebarSection[];
  programmingMode: import('../core/programming-mode.js').ProgrammingModeState;
  projectContext: string | null;
  permissionMode: PermissionMode;
}

const defaultState: TuiState = {
  mode: 'splash',
  chatMessages: [],
  toolSteps: [],
  isThinking: false,
  permissionPrompt: null,
  agentName: 'Mercury',
  version: '1.1.5',
  provider: null,
  tokenInfo: null,
  skills: [],
  subAgents: [],
  sidebarSections: [],
  programmingMode: 'off',
  projectContext: null,
  permissionMode: 'ask-me',
};

export class CLIChannel extends BaseChannel {
  readonly type = 'cli' as const;
  private agentName: string;
  private inkInstance: ReturnType<typeof render> | null = null;
  private inputHandler: ((text: string) => void) | null = null;
  private permissionResolver: ((value: string | boolean) => void) | null = null;
  private menuDepth = 0;
  private menuAbortController: AbortController | null = null;
  private stepCount = 0;
  private stepStartTime = 0;
  private state: TuiState = { ...defaultState };
  private spotifyClient: any = null;

  constructor(agentName: string = 'Mercury') {
    super();
    this.agentName = agentName;
    this.state.agentName = agentName;
  }

  setAgentName(name: string): void {
    this.agentName = name;
    this.update({ agentName: name });
  }

  async start(): Promise<void> {
    this.ready = true;
    logger.info('CLI channel started (Ink TUI)');
  }

  async stop(): Promise<void> {
    this.inkInstance?.unmount();
    this.inkInstance = null;
    this.ready = false;
  }

  private update(partial: Partial<TuiState>): void {
    this.state = { ...this.state, ...partial };
    this.rerender();
  }

  private rerender(): void {
    if (!this.inkInstance) return;
    this.inkInstance.rerender(
      React.createElement(TuiApp, {
        state: this.state,
        onInput: (text: string) => { this.inputHandler?.(text); },
        onPermissionResolve: (value: string | boolean) => {
          if (this.permissionResolver) {
            this.permissionResolver(value);
            this.permissionResolver = null;
          }
          this.update({ permissionPrompt: null });
        },
        spotifyClient: this.spotifyClient,
      }),
    );
  }

  mountTUI(onInput: (text: string) => void, spotifyClient?: any): void {
    this.spotifyClient = spotifyClient ?? null;

    this.inputHandler = (text: string) => {
      const trimmed = text.trim();
      if (trimmed === '/chat' || trimmed === '/c') {
        this.update({ mode: 'chat' });
        return;
      }
      if (trimmed === '/code' || trimmed === '/coding') {
        this.update({ mode: 'coding' });
        return;
      }
      if (trimmed === '/menu' || trimmed === '/m') {
        this.update({ mode: 'menu' });
        return;
      }
      if (trimmed === '/spotify' || trimmed === '/s') {
        this.update({ mode: 'spotify' });
        return;
      }
      if (trimmed === '/splash') {
        this.update({ mode: 'splash' });
        return;
      }
      onInput(trimmed);
    };

    this.inkInstance = render(
      React.createElement(TuiApp, {
        state: this.state,
        onInput: (text: string) => { this.inputHandler?.(text); },
        onPermissionResolve: (value: string | boolean) => {
          if (this.permissionResolver) {
            this.permissionResolver(value);
            this.permissionResolver = null;
          }
          this.update({ permissionPrompt: null });
        },
        spotifyClient: this.spotifyClient,
      }),
      { exitOnCtrlC: false, patchConsole: false },
    );
  }

  async send(content: string, _targetId?: string, _elapsedMs?: number): Promise<void> {
    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role: 'agent',
      content,
      timestamp: Date.now(),
    };
    this.update({
      chatMessages: [...this.state.chatMessages, msg],
      isThinking: false,
    });
  }

  async sendFile(filePath: string, _targetId?: string): Promise<void> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const resolved = path.resolve(filePath);
    let content = '';
    if (!fs.existsSync(resolved)) {
      content = `File not found: ${filePath}`;
    } else {
      const stat = fs.statSync(resolved);
      const sizeStr = stat.size > 1024 * 1024
        ? `${(stat.size / (1024 * 1024)).toFixed(1)}MB`
        : stat.size > 1024
          ? `${(stat.size / 1024).toFixed(1)}KB`
          : `${stat.size}B`;
      content = `path: ${resolved}\nsize: ${sizeStr}`;
    }
    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role: 'agent',
      content,
      timestamp: Date.now(),
    };
    this.update({
      chatMessages: [...this.state.chatMessages, msg],
    });
  }

  async sendToolFeedback(toolName: string, args: Record<string, any>): Promise<void> {
    const label = formatToolStep(toolName, args);
    const step: ToolStep = {
      id: `step-${Date.now()}-${this.stepCount}`,
      toolName,
      label,
      status: 'running',
    };
    this.stepCount += 1;
    this.stepStartTime = Date.now();
    this.update({
      toolSteps: [...this.state.toolSteps, step],
      isThinking: true,
    });
  }

  sendStepDone(toolName: string, result: unknown): void {
    const toolSteps = this.state.toolSteps.map((step) => {
      if (step.status === 'running') {
        const elapsed = this.stepStartTime ? (Date.now() - this.stepStartTime) / 1000 : 0;
        const summary = formatToolResult(toolName, result);
        return { ...step, status: 'done' as const, elapsed, result: summary || undefined };
      }
      return step;
    });
    this.update({ toolSteps });
  }

  async stream(content: AsyncIterable<string>, _targetId?: string): Promise<string> {
    const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let full = '';
    let lastRender = 0;

    const initialMsg: ChatMessage = {
      id: msgId,
      role: 'agent',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };

    this.update({
      chatMessages: [...this.state.chatMessages, initialMsg],
      isThinking: true,
    });

    for await (const chunk of content) {
      full += chunk;
      const now = Date.now();
      if (now - lastRender >= 50) {
        this.update({
          chatMessages: this.state.chatMessages.map((m) =>
            m.id === msgId ? { ...m, content: full, streaming: true } : m,
          ),
        });
        lastRender = now;
      }
    }

    this.update({
      chatMessages: this.state.chatMessages.map((m) =>
        m.id === msgId ? { ...m, content: full, streaming: false } : m,
      ),
      isThinking: false,
    });

    return full;
  }

  async typing(_targetId?: string): Promise<void> {
    this.update({ isThinking: true });
  }

  showPrompt(): void {}

  async withMenu<T>(runner: (select: (title: string, options: Array<{ value: string; label: string }>) => Promise<string>) => Promise<T>): Promise<T | undefined> {
    this.menuDepth += 1;
    const { selectWithArrowKeys } = await import('../utils/arrow-select.js');
    this.menuAbortController = new AbortController();

    try {
      return await runner((title, options) => selectWithArrowKeys(title, options, {
        signal: this.menuAbortController?.signal,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'ArrowSelectCancelledError') {
        return undefined;
      }
      throw error;
    } finally {
      this.menuDepth = Math.max(0, this.menuDepth - 1);
      if (this.menuDepth === 0) {
        this.menuAbortController = null;
      }
    }
  }

  private closeActiveMenu(): void {
    if (!this.menuAbortController?.signal.aborted) {
      this.menuAbortController?.abort();
    }
  }

  async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.permissionResolver = (val) => resolve(String(val));
      this.update({
        permissionPrompt: {
          type: 'ask',
          message: question,
          resolve: () => {},
        },
      });
    });
  }

  async askPermissionMode(): Promise<PermissionMode> {
    if (!process.stdout.isTTY) return 'ask-me';

    return new Promise((resolve) => {
      this.permissionResolver = (val) => resolve(val as PermissionMode);
      this.update({
        permissionPrompt: {
          type: 'mode',
          message: 'Choose how Mercury handles risky actions this session.',
          options: [
            { value: 'ask-me', label: 'Ask Me — confirm before file writes, shell commands, and scope changes' },
            { value: 'allow-all', label: 'Allow All — auto-approve everything (scopes, commands, loop continuation)' },
          ],
          resolve: () => {},
        },
      });
    });
  }

  async askPermission(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.permissionResolver = (val) => resolve(String(val));
      this.update({
        permissionPrompt: {
          type: 'ask',
          message: prompt,
          resolve: () => {},
        },
      });
    });
  }

  async askToContinue(question: string, _targetId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.permissionResolver = (val) => resolve(Boolean(val));
      this.update({
        permissionPrompt: {
          type: 'continue',
          message: question,
          resolve: () => {},
        },
      });
    });
  }

  clearPermissionPrompt(): void {
    this.update({ permissionPrompt: null });
  }

  setSkills(skills: SkillInfo[]): void {
    this.update({ skills });
  }

  setProvider(name: string, model: string, badge?: string): void {
    this.update({ provider: { name, model, badge } });
  }

  setTokenInfo(used: number, budget: number, percentage: number): void {
    this.update({ tokenInfo: { used, budget, percentage } });
  }

  setSubAgents(agents: SubAgentInfo[]): void {
    this.update({ subAgents: agents });
  }

  setSidebarSections(sections: SidebarSection[]): void {
    this.update({ sidebarSections: sections });
  }

  setMode(mode: AppMode): void {
    this.update({ mode });
  }

  initSplash(agentName: string, version: string): void {
    this.update({ agentName, version, mode: 'splash' });
  }

  sendUserMessage(content: string): void {
    const userMsg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.update({ chatMessages: [...this.state.chatMessages, userMsg] });
    this.emit({
      id: userMsg.id,
      channelId: 'cli',
      channelType: 'cli',
      senderId: 'owner',
      content,
      timestamp: userMsg.timestamp,
    });
  }
}