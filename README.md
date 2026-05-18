# @pr0ger/vite-plugin-tailscale-funnel

A Vite plugin that automatically starts [Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel/) or [Tailscale Serve](https://tailscale.com/kb/1312/serve/) when your dev server starts.

## Installation

```bash
npm install -D @pr0ger/vite-plugin-tailscale-funnel
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { tailscaleFunnel } from '@pr0ger/vite-plugin-tailscale-funnel';

export default defineConfig({
  plugins: [
    tailscaleFunnel(),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hostname` | `string` | Auto-detected | Your Tailscale hostname (e.g., `laptop.tailnet1337.ts.net`) |
| `autoDetectHostname` | `boolean` | `true` | Automatically detect hostname from `tailscale status --json` |
| `port` | `number` | Vite's bound port | Port to expose via Funnel/Serve |
| `disabled` | `boolean` | `process.env.CI === 'true'` | Disable the plugin (useful for CI) |
| `mode` | `'funnel' \| 'serve'` | `'funnel'` | `funnel` = public internet, `serve` = local Tailnet only |

## Examples

### Basic usage with auto-detected hostname

```ts
tailscaleFunnel()
```

### Explicit hostname

```ts
tailscaleFunnel({
  hostname: 'my-machine.tailnet-name.ts.net',
})
```

### Local network only (Tailscale Serve)

```ts
tailscaleFunnel({
  mode: 'serve',
})
```

### Custom port

```ts
tailscaleFunnel({
  port: 3000,
})
```

### Disable in specific environments

```ts
tailscaleFunnel({
  disabled: process.env.NODE_ENV === 'test',
})
```

## Requirements

- [Tailscale](https://tailscale.com/) must be installed and running
- For Funnel mode: Funnel must be enabled on your tailnet

## License

MIT
