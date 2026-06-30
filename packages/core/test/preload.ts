import path from "path"

process.env.AGNESCODE_DB = ":memory:"
process.env.AGNESCODE_MODELS_PATH = path.join(import.meta.dir, "plugin", "fixtures", "models-dev.json")
process.env.AGNESCODE_DISABLE_MODELS_FETCH = "true"
