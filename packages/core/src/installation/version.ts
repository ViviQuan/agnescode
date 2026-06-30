declare global {
  const AGNESCODE_VERSION: string
  const AGNESCODE_CHANNEL: string
}

export const InstallationVersion = typeof AGNESCODE_VERSION === "string" ? AGNESCODE_VERSION : "local"
export const InstallationChannel = typeof AGNESCODE_CHANNEL === "string" ? AGNESCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
