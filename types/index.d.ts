// Contrato do estado do sql-guard: o que o painel acima do prompt lê.

export type Segment = { text: string; tone?: 'confirm' | 'cancel' }

export type PanelState = {
  title: string
  lines: string[]
  command: string
  segments: Segment[]
} | null

declare module 'claude-code' {
  interface PluginState {
    'sql-guard': { panel: PanelState }
  }
}
