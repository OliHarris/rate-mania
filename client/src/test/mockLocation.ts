// jsdom does not implement navigation, so window.location.reload() can't be
// observed directly. jsdom also only honours the first redefinition of
// window.location, so install a single getter and swap what it returns.
const realLocation = window.location;
let currentLocation: Location = realLocation;
let installed = false;

const install = () => {
  if (installed) return;
  Object.defineProperty(window, "location", {
    configurable: true,
    get: () => currentLocation
  });
  installed = true;
};

export const mockLocationReload = () => {
  install();
  const reload = jest.fn();
  currentLocation = {
    href: realLocation.href,
    origin: realLocation.origin,
    protocol: realLocation.protocol,
    host: realLocation.host,
    hostname: realLocation.hostname,
    port: realLocation.port,
    pathname: realLocation.pathname,
    search: realLocation.search,
    hash: realLocation.hash,
    reload
  } as unknown as Location;
  return {
    reload,
    restore: () => {
      currentLocation = realLocation;
    }
  };
};
