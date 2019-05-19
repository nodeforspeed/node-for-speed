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
    const { prefix, path, method, handler, branch } = route
    const url = `${ prefix }/${ path }`
    const handlers = []

    if (branch) {
      push(handlers, branch.handler)
    }

    push(handlers, handler)

    server[ method ](url, ...handlers)
  }
}

function push (handlers, handler) {
  if (Array.isArray(handler)) {
    handlers.push(...handler)
  }
  else if (handler instanceof Function) {
    handlers.push(handler)
  }
}
