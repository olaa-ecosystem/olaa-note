import { useEffect, useState } from 'react';

export type Route = { name: 'library' } | { name: 'doc'; id: string };

export function parseHash(hash: string): Route {
  const m = /^#\/doc\/([\w-]+)$/.exec(hash);
  return m ? { name: 'doc', id: m[1] } : { name: 'library' };
}

export function navigate(route: Route): void {
  window.location.hash = route.name === 'doc' ? `/doc/${route.id}` : '/';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
