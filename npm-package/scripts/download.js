#!/usr/bin/env node
import { mkdirSync } from "fs"
import { chmod, rm, rename } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"
import { platform, arch } from "os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BIN_DIR = join(__dirname, "..", "bin")
const BIN_PATH = join(BIN_DIR, "agnes")

const VERSION = "0.1.11"

function getTarget() {
  const os = platform()
  const cpu = arch()

  let targetOs = os === "darwin" ? "darwin" : os === "win32" ? "windows" : os === "linux" ? "linux" : null
  let targetArch = cpu === "arm64" ? "arm64" : cpu === "x64" ? "x64" : null

  if (!targetOs || !targetArch) {
    console.error(`Unsupported platform: ${os} ${cpu}`)
    process.exit(1)
  }

  const ext = targetOs === "linux" ? "tar.gz" : "zip"
  return { targetOs, targetArch, ext }
}

async function main() {
  const { targetOs, targetArch, ext } = getTarget()
  const filename = `agnescode-${targetOs}-${targetArch}.${ext}`
  const url = `https://github.com/ViviQuan/agnescode/releases/download/v${VERSION}/${filename}`
  const tmpDir = join(BIN_DIR, ".tmp")
  mkdirSync(tmpDir, { recursive: true })

  const archivePath = join(tmpDir, filename)
  console.log(`Downloading agnes v${VERSION} for ${targetOs}-${targetArch}...`)
  execSync(`curl -fsSL -o "${archivePath}" "${url}"`, { stdio: "inherit" })

  if (ext === "tar.gz") {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`)
  } else {
    execSync(`unzip -q "${archivePath}" -d "${tmpDir}"`)
  }

  const extractedBin = join(tmpDir, "agnes")
  await rename(extractedBin, BIN_PATH)
  await chmod(BIN_PATH, 0o755)
  await rm(tmpDir, { recursive: true, force: true })
  console.log(`agnes installed to ${BIN_PATH}`)
}

main().catch((err) => {
  console.error("Failed to install agnes binary:", err.message)
  console.error("You can manually download from: https://github.com/ViviQuan/agnescode/releases")
})
