import defaultConfig from "vite-config-custom";

defaultConfig.build.rollupOptions = {
  output: {
    banner: "#!/usr/bin/env node",
  },
};

export default defaultConfig;
