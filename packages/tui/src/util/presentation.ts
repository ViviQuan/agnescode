const logo = [
  "█████╗  ██████╗ ███╗   ██╗███████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗",
  "██╔══██╗██╔════╝ ████╗  ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "███████║██║  ███╗██╔██╗ ██║█████╗  ███████╗██║     ██║   ██║██║  ██║█████╗  ",
  "██╔══██║██║   ██║██║╚██╗██║██╔══╝  ╚════██║██║     ██║   ██║██║  ██║██╔══╝  ",
  "██║  ██║╚██████╔╝██║ ╚████║███████╗███████║╚██████╗╚██████╔╝██████╔╝███████╗",
  "╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
]

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"

function wordmark(pad = "") {
  return logo.map((line) => `${pad}${line}`)
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  return [
    ...wordmark("  "),
    "",
    `  ${weak("Session")}${bold}${input.title}${reset}`,
    `  ${weak("Continue")}${bold}agnescode -s ${input.sessionID}${reset}`,
    "",
  ].join("\n")
}
