import cp from 'node:child_process';

import { DEBUG_PORTS, deploymentCatalogIncludingOverlays, type Service } from '@example/sears-catalog';

interface PortsFromServicesResult {
  port: number;
  serviceName: Service | 'debug';
}

export function portsFromServices(
  deployments: Service[],
  /**
   * When true, includes ports for non-catalog processes (debug ports) that should be killed before
   * startup but aren't tracked in the deployment catalog. Set to false when you only care about
   * catalog service ports.
   */
  includeNonCatalogPorts: boolean,
): PortsFromServicesResult[] {
  const out: PortsFromServicesResult[] = includeNonCatalogPorts
    ? DEBUG_PORTS.map(p => ({ port: p, serviceName: 'debug' as const }))
    : [];
  deployments.forEach(d => {
    const conf = deploymentCatalogIncludingOverlays[d];
    if (!conf) {
      // For now, we don't want to throw here because we might have an overlay service that isn't in the catalog
      // If we eventually add overlays that modify the port, we can throw here
      return;
    }
    const { PORT, GRPC_PORT } = conf.env;
    if (typeof PORT === 'number') out.push({ port: PORT, serviceName: d });
    if (typeof GRPC_PORT === 'number') out.push({ port: GRPC_PORT, serviceName: d });
  });
  return out;
}

// lsof's -i flag refuses more than 100 comma-separated addresses ("network address limit (100)
// exceeded"), so large presets must be split into chunks and killed per-chunk.
const MAX_PORTS_PER_LSOF_CALL = 100;

export function killPorts(ports: number[]): void {
  /**
   * lsof: -n no host name lookups, -t terse output (PIDs only, for kill), -l no login name lookups,
   * -i tcp:<ports> -s tcp:LISTEN only processes listening on those ports.
   * xargs -r: don't run kill if there is no input.
   */
  console.log('killing processes occupying relevant ports');
  for (let i = 0; i < ports.length; i += MAX_PORTS_PER_LSOF_CALL) {
    const chunk = ports.slice(i, i + MAX_PORTS_PER_LSOF_CALL);
    const cmd = `lsof -n -l -t -i tcp:${chunk.join(',')} -s tcp:LISTEN | xargs -r kill -9`;
    console.log('cmd: ', cmd);
    try {
      cp.execSync(cmd);
    } catch {
      console.error('failed to kill procs, hope everything is fine');
    }
  }
}
