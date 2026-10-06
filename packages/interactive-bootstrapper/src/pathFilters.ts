import { deploymentCatalogIncludingOverlays, type Service } from '@example/sears-catalog';

type TurboCompatibleFilter = `--filter=${string}`;

// These are being fed into turbo, which does not allow spaces (e.g. '--filter pkg-name') nor does it allow the pnpm filter shorthand of '-F' (e.g. '-F pkg-name')
export function deploymentsToPathFilters(deployments: Service[]): TurboCompatibleFilter[] {
  const pkgs = new Set<string>();
  deployments.forEach(d => {
    const conf = deploymentCatalogIncludingOverlays[d];
    if (conf?.pkg) {
      pkgs.add(conf.pkg);
    }
  });

  return Array.from(pkgs).map(p => `--filter=${p}` as const);
}
