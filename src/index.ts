import type {Plugin, ViteDevServer} from 'vite';
import {type ChildProcess, execSync, spawn} from 'child_process';
import pc from 'picocolors';

export interface TailscaleFunnelOptions {
  hostname?: string;
  autoDetectHostname?: boolean;
  port?: number;
  disabled?: boolean;
  mode?: 'funnel' | 'serve';
}

interface TailscaleStatus {
  Self: {
    DNSName: string;
  };
}

function getHostnameFromTailscale(): string | null {
  try {
    const output = execSync('tailscale status --json', {encoding: 'utf-8'});
    const status: TailscaleStatus = JSON.parse(output);
    return status.Self.DNSName.replace(/\.$/, '');
  } catch {
    return null;
  }
}

function getExposedPort(server: ViteDevServer, configuredPort?: number): number {
  if (configuredPort !== undefined) {
    return configuredPort;
  }

  const address = server.httpServer?.address();
  if (address && typeof address === 'object') {
    return address.port;
  }

  return server.config.server.port ?? 5173;
}

function killProcess(proc: ChildProcess | null): void {
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
  }
}

export default function tailscaleFunnel(options: TailscaleFunnelOptions = {}): Plugin {
  let funnelProcess: ChildProcess | null = null;
  const disabled = options.disabled ?? process.env.CI === 'true';
  const mode = options.mode ?? 'funnel';

  const cleanup = () => {
    killProcess(funnelProcess);
    funnelProcess = null;
  };

  const setupSignalHandlers = () => {
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
  };

  return {
    name: 'vite-plugin-tailscale-funnel',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      if (disabled) {
        return;
      }

      let hostname = options.hostname;
      if (!hostname && options.autoDetectHostname !== false) {
        hostname = getHostnameFromTailscale() ?? undefined;
      }

      if (!hostname) {
        console.log(
          pc.yellow('\n  ⚠ Could not detect Tailscale hostname. Set hostname option or ensure Tailscale is running.\n')
        );
        return;
      }

      server.httpServer?.once('listening', () => {
        const port = getExposedPort(server, options.port);
        const url = `https://${hostname}/`;
        const modeLabel = mode === 'funnel' ? 'Funnel' : 'Serve';
        const modeIcon = mode === 'funnel' ? '🌐' : '🔒';

        console.log(
          `\n  ${modeIcon} ${pc.cyan(`Tailscale ${modeLabel}`)} → ${pc.green(url)}\n`
        );

        const command = mode === 'funnel' ? 'funnel' : 'serve';
        funnelProcess = spawn('tailscale', [command, `${port}`], {
          stdio: 'inherit',
          detached: false,
        });

        setupSignalHandlers();

        funnelProcess.on('error', (err: Error) => {
          console.error(pc.red(`Failed to start Tailscale ${modeLabel}:`), err.message);
        });

        funnelProcess.on('exit', (code: number | null) => {
          if (code !== 0 && code !== null) {
            console.error(pc.red(`Tailscale ${modeLabel} exited with code ${code}`));
          }
          funnelProcess = null;
        });
      });

      server.httpServer?.on('close', cleanup);
    },

    buildEnd() {
      cleanup();
    },
  };
}

export { tailscaleFunnel };
