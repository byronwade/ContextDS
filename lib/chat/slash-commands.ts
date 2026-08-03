/**
 * Slash commands for the Scan composer.
 *
 * A slash command is a shorthand for a sentence — it expands to natural
 * language that the agent already knows how to act on, rather than calling a
 * tool directly. That keeps one execution path (the agent decides), so a
 * command never drifts out of sync with what the tools actually do, and the
 * user can always edit the expanded text before sending.
 */

export type SlashCommand = {
  name: string
  /** Shown after the name in the menu, e.g. "<domain>" */
  args?: string
  description: string
  /** Example the user can run verbatim */
  example: string
  /** Turn raw argument text into the prompt actually sent. */
  expand: (args: string) => string
}

const domainList = (args: string): string[] =>
  args
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'scan',
    args: '<domain>',
    description: 'Scan a site and build its Design Contract',
    example: '/scan stripe.com',
    expand: (args) =>
      args.trim()
        ? `Scan ${args.trim()} and show me the Design Contract — summarize the system and how to install it.`
        : 'Which site should I scan? Give me a domain.',
  },
  {
    name: 'app',
    args: '<product name?>',
    description: 'App UI from a screenshot (attach an image)',
    example: '/app Cursor',
    expand: (args) =>
      args.trim()
        ? `I want the APPLICATION design system for ${args.trim()}, not the marketing site. Use my attached screenshot (or ask me to attach one) and call contract_from_screenshot with preferApp=true.`
        : 'I want an APPLICATION Design Contract from a product UI screenshot — not marketing. I will attach an image; call contract_from_screenshot.',
  },
  {
    name: 'canvas',
    args: '<domain | blank>',
    description: 'Open the live design canvas to edit a system',
    example: '/canvas stripe.com',
    expand: (args) => {
      const domains = domainList(args)
      if (domains.length === 0) return 'Open the design canvas with a blank system so I can author one by hand.'
      if (domains.length === 1) return `Open the design canvas seeded from ${domains[0]}.`
      return `Blend ${domains.join(', ')} into one system and open it in the design canvas.`
    },
  },
  {
    name: 'blend',
    args: '<domain> <domain> …',
    description: 'Merge 2–10 systems into one coherent system',
    example: '/blend stripe.com linear.app vercel.com',
    expand: (args) => {
      const domains = domainList(args)
      return domains.length >= 2
        ? `Blend ${domains.join(', ')} into one coherent design system and give me the DESIGN.md.`
        : 'Which sites should I blend? Give me at least two domains.'
    },
  },
  {
    name: 'compare',
    args: '<domain> <domain>',
    description: 'Compare two design systems side by side',
    example: '/compare stripe.com linear.app',
    expand: (args) => {
      const domains = domainList(args)
      return domains.length >= 2
        ? `Compare ${domains[0]} and ${domains[1]} — palette, type, spacing, corners — and tell me how they actually differ.`
        : 'Which two sites should I compare?'
    },
  },
  {
    name: 'critique',
    args: '<domain>',
    description: 'Measurable critique of a scanned system',
    example: '/critique stripe.com',
    expand: (args) =>
      args.trim()
        ? `Critique ${args.trim()}'s design system with numbers — contrast coverage, grid conformance, font and radius sprawl.`
        : 'Which site should I critique?',
  },
  {
    name: 'theme',
    args: '<domain>',
    description: 'Generate CSS variables / Tailwind theme',
    example: '/theme stripe.com',
    expand: (args) =>
      args.trim()
        ? `Generate a ready-to-paste Tailwind @theme block and CSS :root variables from ${args.trim()}.`
        : 'Which system should I turn into a theme?',
  },
  {
    name: 'contrast',
    args: '<color> <color>',
    description: 'WCAG contrast ratio and grade for two colors',
    example: '/contrast #1b1b1d #ffffff',
    expand: (args) => {
      const parts = args.split(/[\s,]+/).filter(Boolean)
      return parts.length >= 2
        ? `Check the WCAG contrast between ${parts[0]} and ${parts[1]} and tell me what it passes.`
        : 'Give me two colors to check, e.g. /contrast #1b1b1d #ffffff'
    },
  },
  {
    name: 'similar',
    args: '<domain | color>',
    description: 'Find systems with a similar accent',
    example: '/similar stripe.com',
    expand: (args) =>
      args.trim()
        ? `Find design systems in the library similar to ${args.trim()}.`
        : 'What should I find lookalikes for — a domain or a color?',
  },
  {
    name: 'contract',
    args: '<domain>',
    description: 'Get the installable contract pack',
    example: '/contract stripe.com',
    expand: (args) =>
      args.trim()
        ? `Give me the Design Contract download for ${args.trim()} and the exact install command.`
        : 'Which contract do you want to download?',
  },
  {
    name: 'help',
    description: 'List what Scan can do',
    example: '/help',
    expand: () =>
      'What can you do? List your capabilities briefly — scanning, blending, the canvas, themes, contrast — with one example each.',
  },
]

const BY_NAME = new Map(SLASH_COMMANDS.map((command) => [command.name, command]))

/**
 * Parse a composer value into a command + its arguments.
 * Returns null when the text is not a slash command.
 */
export function parseSlashCommand(
  text: string
): { command: SlashCommand; args: string } | null {
  const match = /^\/([a-z][a-z0-9-]*)\s*([\s\S]*)$/i.exec(text.trim())
  if (!match) return null
  const command = BY_NAME.get(match[1].toLowerCase())
  return command ? { command, args: match[2] } : null
}

/**
 * Commands matching the token being typed. Only offers a menu while the user
 * is still on the command word — once they start typing arguments the menu
 * gets out of the way.
 */
export function matchSlashCommands(text: string): SlashCommand[] {
  const match = /^\/([a-z0-9-]*)$/i.exec(text)
  if (!match) return []
  const prefix = match[1].toLowerCase()
  return SLASH_COMMANDS.filter((command) => command.name.startsWith(prefix))
}

/**
 * Expand a composer value for sending. Non-command text passes through
 * unchanged, so typing a message that merely starts with a slash-like word is
 * never mangled.
 */
export function expandForSend(text: string): string {
  const parsed = parseSlashCommand(text)
  return parsed ? parsed.command.expand(parsed.args) : text
}
