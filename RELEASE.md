# Release v1.1.12

## ☿ Mercury Agent v1.1.12 — Daemon hotfix

Hotfix on top of [v1.1.11](https://github.com/cosmicstack-labs/mercury-agent/releases/tag/v1.1.11). The standalone single-file binaries introduced in 1.1.11 could not start in the background — which meant Telegram never came online for anyone who installed Mercury via the one-line installer (the recommended path for web servers).

### What Was Broken

`src/cli/daemon.ts` spawned the daemon child as:

```
spawn(process.execPath, [process.argv[1], 'start', '--daemon'], ...)
```

- **npm install:** resolved to `node dist/index.js start --daemon` ✅
- **Standalone binary** (`bun build --compile`): resolved to `mercury "/$bunfs/root/.../index.js" start --daemon` — Commander treated the bun-virtual path as an unknown subcommand, the child exited immediately, and `channels.startAll()` (the only place Telegram's `bot.start()` runs in daemon mode) was never reached.

`mercury service install` had the same flaw and was persisting that broken command into the LaunchAgent plist / systemd unit / Task Scheduler entry, so the failure also survived reboots.

### Fixed

- **Daemon now spawns correctly from both install paths** — new `isStandaloneBinary()` detection in `src/cli/daemon.ts` chooses between `[node, script, 'start', '--daemon']` (npm) and `[mercury, 'start', '--daemon']` (standalone binary). Detection looks at `process.versions.bun`, `$bunfs` / `~BUN` markers in `argv[1]`, and the `execPath` basename, so `node`, `bun <script>` (dev), and standalone `mercury` all do the right thing.
- **System-service files generated correctly for standalone installs** — macOS LaunchAgent `ProgramArguments`, Linux systemd `ExecStart=`, and Windows `schtasks /tr` now use the binary-only invocation when running from a compiled binary.
- **Telegram comes online again in background mode** — direct consequence of the daemon fix.

### Upgrade

**npm:**
```
npm install -g @cosmicstack/mercury-agent@1.1.12
mercury restart
```

**Standalone binary:** re-run the one-line installer from [mercuryagent.sh](https://mercuryagent.sh), then:
```
mercury restart
```

If you had `mercury service install` set up under 1.1.11 (so the broken command got written into your service file), reinstall it:
```
mercury service uninstall
mercury service install
```

### Verifying The Fix

```
mercury start
mercury status      # should show a live PID
mercury logs        # should show "Mercury is live (daemon mode)" and Telegram polling
```

### Files Touched

- `src/cli/daemon.ts` — `isStandaloneBinary()` + `buildDaemonSpawnArgs()`; `ensureDaemonRunning()` uses them.
- `src/cli/service.ts` — `getServiceLaunchArgs()` wired into macOS / Linux / Windows installers.

**Full Changelog**: https://github.com/cosmicstack-labs/mercury-agent/compare/v1.1.11...v1.1.12
