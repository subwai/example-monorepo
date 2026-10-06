import { deploymentCatalog, PORTS_WE_SHOULDNT_USE } from '@example/sears-catalog';

function suggestUnusedPort() {
  const portsInUse = new Set<number>();
  Object.values(deploymentCatalog).forEach(conf => {
    const env: { PORT?: number; GRPC_PORT?: number } = conf.env;
    if (typeof env.PORT === 'number') portsInUse.add(env.PORT);
    if (typeof env.GRPC_PORT === 'number') portsInUse.add(env.GRPC_PORT);
  });
  let port = 4001;
  while (portsInUse.has(port) || PORTS_WE_SHOULDNT_USE.has(port)) {
    port += 1;
  }

  console.log('first suggested port: ', port);
}

suggestUnusedPort();
