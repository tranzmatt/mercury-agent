import { z } from 'zod';

const TOOL_LABELS: Record<string, { icon: string; label: string; argKey?: string; argTransform?: (v: string) => string }> = {
  fetch_url: { icon: '↗', label: 'Fetching', argKey: 'url', argTransform: extractDomain },
  read_file: { icon: '📄', label: 'Reading', argKey: 'path', argTransform: basename },
  write_file: { icon: '✏️', label: 'Writing', argKey: 'path', argTransform: basename },
  create_file: { icon: '✨', label: 'Creating', argKey: 'path', argTransform: basename },
  edit_file: { icon: '✂️', label: 'Editing', argKey: 'path', argTransform: basename },
  delete_file: { icon: '🗑', label: 'Deleting', argKey: 'path', argTransform: basename },
  list_dir: { icon: '📂', label: 'Listing', argKey: 'path', argTransform: basename },
  approve_scope: { icon: '🔓', label: 'Approving scope' },
  run_command: { icon: '⌨', label: 'Running command', argKey: 'command', argTransform: truncate(40) },
  cd: { icon: '📂', label: 'Changing dir to', argKey: 'path' },
  approve_command: { icon: '✅', label: 'Approving command' },
  send_message: { icon: '💬', label: 'Sending message' },
  send_file: { icon: '📎', label: 'Sending file', argKey: 'path', argTransform: basename },
  git_status: { icon: '📊', label: 'Git status' },
  git_diff: { icon: '📝', label: 'Git diff' },
  git_log: { icon: '📋', label: 'Git log' },
  git_add: { icon: '➕', label: 'Staging files' },
  git_commit: { icon: '💾', label: 'Committing' },
  git_push: { icon: '⬆', label: 'Pushing' },
  create_pr: { icon: '🔀', label: 'Creating PR' },
  review_pr: { icon: '👀', label: 'Reviewing PR' },
  list_issues: { icon: '📋', label: 'Listing issues' },
  create_issue: { icon: '🐛', label: 'Creating issue' },
  github_api: { icon: '🔀', label: 'GitHub API', argKey: 'path', argTransform: truncate(30) },
  schedule_task: { icon: '⏰', label: 'Scheduling task' },
  cancel_task: { icon: '❌', label: 'Cancelling task' },
  list_tasks: { icon: '📋', label: 'Listing tasks' },
  use_skill: { icon: '🧠', label: 'Using skill', argKey: 'name' },
  list_skills: { icon: '📋', label: 'Listing skills' },
  install_skill: { icon: '📥', label: 'Installing skill' },
  budget_status: { icon: '💰', label: 'Budget status' },
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function basename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || p;
}

function truncate(maxLen: number): (v: string) => string {
  return (v: string) => v.length > maxLen ? v.slice(0, maxLen) + '…' : v;
}

export function formatToolStep(toolName: string, args: Record<string, any>): string {
  const config = TOOL_LABELS[toolName];
  if (!config) {
    return toolName;
  }

  let detail = '';
  if (config.argKey && args[config.argKey] !== undefined) {
    const raw = String(args[config.argKey]);
    detail = config.argTransform ? config.argTransform(raw) : raw;
  }

  return detail ? `${config.icon} ${config.label} ${detail}` : `${config.icon} ${config.label}`;
}