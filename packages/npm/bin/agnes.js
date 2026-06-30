#!/usr/bin/env node
import { existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const binPath = join(__dirname, "agnes")

if (!existsSync(binPath)) {
  console.error("agnes binary not found. Run 'npm install agnescode' to download it.")
  console.error("Or download manually: https://github.com/ViviQuan/agnescode/releases")
  process.exit(1)
}

const child = spawn(binPath, process.argv.slice(2), { stdio: "inherit" })
child.on("exit", (code) => process.exit(code ?? 0))
