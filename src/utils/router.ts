export type PageRoute = 
  | 'home' 
  | 'gallery' 
  | 'cake' 
  | 'cart'
  | 'order' 
  | 'configurator' 
  | 'orders' 
  | 'order-detail' 
  | 'reviews' 
  | 'about' 
  | 'admin';

export interface RouteState {
  page: PageRoute;
  params: Record<string, string>;
}

export function parseRouteFromLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { page: 'home', params: {} };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const rawPage = urlParams.get('page') || urlParams.get('tab');
  
  // Direct shortcuts
  const cakeParam = urlParams.get('cake') || urlParams.get('cakeId');
  const orderParam = urlParams.get('order') || urlParams.get('orderId');

  const params: Record<string, string> = {};
  urlParams.forEach((val, key) => {
    params[key] = val;
  });

  if (orderParam && (!rawPage || rawPage === 'order-detail' || rawPage === 'orders')) {
    return {
      page: 'order-detail',
      params: { ...params, orderId: orderParam }
    };
  }

  if (cakeParam && (!rawPage || rawPage === 'cake')) {
    return {
      page: 'cake',
      params: { ...params, cakeId: cakeParam }
    };
  }

  const validPages: PageRoute[] = [
    'home',
    'gallery',
    'cake',
    'cart',
    'order',
    'configurator',
    'orders',
    'order-detail',
    'reviews',
    'about',
    'admin'
  ];

  if (rawPage && validPages.includes(rawPage as PageRoute)) {
    return {
      page: rawPage as PageRoute,
      params
    };
  }

  // Legacy tab aliases
  if (rawPage === 'custom') {
    return { page: 'configurator', params };
  }

  return { page: 'home', params };
}

export function buildRouteUrl(page: PageRoute, params: Record<string, string> = {}): string {
  const urlParams = new URLSearchParams();
  if (page !== 'home') {
    urlParams.set('page', page);
  }
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== 'page') {
      urlParams.set(k, v);
    }
  });

  const query = urlParams.toString();
  return query ? `?${query}` : window.location.pathname;
}
