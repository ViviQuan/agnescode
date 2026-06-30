import yargs from "yargs"
import { TuiThreadCommand } from "./cli/cmd/tui"
import { InstallationVersion } from "@agnes-ai/core/installation/version"
import { hideBin } from "yargs/helpers"
const cli = yargs(hideBin(process.argv))
  .parserConfiguration({ "populate--": true })
  .scriptName("agnescode")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware((opts) => {
    if (opts.printLogs) process.env.AGNESCODE_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.AGNESCODE_LOG_LEVEL = opts.logLevel
  })
  .command(TuiThreadCommand)
  .parse()
