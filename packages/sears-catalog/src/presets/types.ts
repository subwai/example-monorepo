interface EnvConf {
  /**
   * SERVER_TYPE is a common way of differentiating which mode an app is running in
   */
  SERVER_TYPE?: string;
  /**
   * SERVER_MODE picks the transport of a generated service (GRAPHQL or GRPC)
   */
  SERVER_MODE?: string;
  /**
   * PORT is special will be consulted for which processes to kill when starting
   */
  PORT?: number;
  /**
   * GRPC_PORT is special will be consulted for which processes to kill when starting
   */
  GRPC_PORT?: number;
}

export interface AppConfig {
  type: 'grpc-api' | 'graphql-api' | 'worker' | 'rest-api' | 'frontend' | 'development-tool' | 'unknown';
  tldr: string;
  required: boolean;
  icon: string;
  color?: string; // Can add a predefined color, otherwise will be random
  /**
   * The env configuration should be used for vars that vary across multi-mode apps
   * such as port, server type, etc.
   * For stuff that all versions of the app need, put it in the relevant .env files
   */
  env: EnvConf;
  /**
   * The name of the pnpm package (name field in package.json) in which we will run a script
   * `null` signifies running in root, which is almost certainly not what you want
   */
  pkg: string | null;

  /**
   * The key of the script in the package.json file to run
   */
  script: string;
  overlays?: Record<string, Partial<AppConfig>>;

  /**
   * arguments to be passed to the script call
   */
  args?: string[];
}

export interface Preset<Name extends string = string> {
  name: string;
  deployments: Name[];
  excludeRequired?: boolean;
}
