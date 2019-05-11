module.exports = (server, route, adapter, router) => {
  if (adapter instanceof Function) {
    adapter(server, route, router)
  }
  else if (adapter && adapter.handler instanceof Function) {
    adapter.handler(server, route, router)
  }
  else if (router) {
    router.handler(route)
  }
  else {
    const { prefix, path, method, handler } = route
    const url = `${ prefix }/${ path }`

    Array.isArray(handler)
      ? server[ method ](url, ...handler)
      : server[ method ](url, handler)
  }
}
