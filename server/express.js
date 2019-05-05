module.exports = (server, route, adapter) => {
  if (adapter instanceof Function) {
    adapter(server, route)
  }
  else if (adapter && adapter.handler instanceof Function) {
    adapter.handler(server, route)
  }
  else {
    const { prefix, path, method, handler } = route
    server[ method ](`${ prefix }/${ path }`, handler)
  }
}
