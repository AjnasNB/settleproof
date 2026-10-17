import handler from './core/api';
import { AgreementStore } from './agreements/store';
import { agreementRoute } from './agreements/router';

// The namespace receives Wrangler's environment separately. Strip it inside
// the object's constructor too, so an existing .dev.vars cannot enable PayPal.
export class OfflineAgreementStore extends AgreementStore {
  constructor(ctx: DurableObjectState) { super(ctx, {}); }
}

// Offline mode deliberately discards every environment value except local assets.
// Existing .dev.vars credentials or AI flags cannot enable provider access here.
export default {
  fetch(request: Request, env: { ASSETS: Fetcher; AGREEMENTS: DurableObjectNamespace<OfflineAgreementStore>; API_RATE: RateLimit }) {
    if (new URL(request.url).pathname.startsWith('/api/agreements'))
      return agreementRoute(request, { AGREEMENTS: env.AGREEMENTS, API_RATE: env.API_RATE });
    return handler.fetch(request, { ASSETS: env.ASSETS, AI_ENABLED: 'false' });
  },
};
