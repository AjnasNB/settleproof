import handler from './core/api';

// Offline mode deliberately discards every environment value except local assets.
// Existing .dev.vars credentials or AI flags cannot enable provider access here.
export default {
  fetch(request: Request, env: { ASSETS: Fetcher }) {
    return handler.fetch(request, { ASSETS: env.ASSETS, AI_ENABLED: 'false' });
  },
};
