import { useEffect, useState } from 'react';
import { buildCrowdContext, type CrowdContext } from '../utils/mc/plan';
import type { LotofacilResult } from '../game';

// O histórico completo (com rateios) é pesado: carrega sob demanda, só quando a
// aba Monte Carlo é aberta, e ajusta o modelo de multidão no navegador (~100 ms).
export const useCrowdContext = (enabled: boolean) => {
  const [ctx, setCtx] = useState<CrowdContext | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || ctx) return;
    let alive = true;
    import('../data/lotofacil-history.json')
      .then((m) => { if (alive) setCtx(buildCrowdContext(m.default as unknown as LotofacilResult[])); })
      .catch((e) => { console.error(e); if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [enabled, ctx]);
  return { ctx, failed };
};
