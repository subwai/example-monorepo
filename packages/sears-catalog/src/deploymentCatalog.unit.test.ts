import { describe, expect, it } from 'vitest';

import { deploymentCatalog, PORTS_WE_SHOULDNT_USE } from '#deploymentCatalog';
import { presets } from '#presets/index';
import type { AppConfig } from '#presets/types';

const ports = Object.entries(deploymentCatalog).flatMap(([name, conf]: [string, AppConfig]) =>
  [conf.env.PORT, conf.env.GRPC_PORT].filter(port => port !== undefined).map(port => ({ name, port })),
);

describe('deploymentCatalog', () => {
  it('gives every service its own ports', () => {
    const seen = new Map<number, string>();
    const collisions = ports.flatMap(({ name, port }) => {
      const owner = seen.get(port);
      seen.set(port, name);
      return owner === undefined ? [] : [`${port}: ${owner} and ${name}`];
    });
    expect(collisions).toEqual([]);
  });

  it('avoids reserved and ephemeral ports', () => {
    expect(ports.filter(({ port }) => PORTS_WE_SHOULDNT_USE.has(port))).toEqual([]);
  });

  it('starts the required services in every preset', () => {
    for (const preset of presets) {
      expect(preset.deployments).toEqual(expect.arrayContaining(['api-rspack', 'web']));
    }
  });
});
