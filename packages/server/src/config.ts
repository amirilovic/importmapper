export const config = {
  server: {
    port: process.env.SERVER_PORT || 3000,
  },
  tempDirPath: process.env.TEMP_DIR_PATH || ".npm",
  outputDirPath: process.env.OUTPUT_DIR_PATH || ".esm",
};
