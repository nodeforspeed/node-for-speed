let conf = ''
let defaults = {}
const main = process.cwd()
const Path = require('path')
const fs = require('fs')
const { promisify } = require('util')

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const Adapter = require('../adapter')
const Route = require('../route')
const Router = require('../router')
const methods = require('../lib/methods')
const exists = require('../lib/exists')
const awaits = require('../lib/awaits')

const $collect = Symbol('collect')
const $getLoader = Symbol('getLoader')
const $getAdapter = Symbol('getAdapter')
const $getRouteClass = Symbol('getRouteClass')
const $getRouterClass = Symbol('getRouterClass')

const loaders = {
  express: '../server/express'
}

const routers = {
  express: '../router/express'
}

const interop = module => module.__esModule
  ? module.default
  : module

class NodeForSpeed {
  static async load (server, opt = {}) {
    const options = Object.assign({}, defaults, opt)
    const {
      adapter: adaptr,
      endpoints = {},
      loader = 'express',
      paths,
      route,
      router
    } = options

    const load = this[ $getLoader ](loader)
    const Router = this[ $getRouterClass ](router)
    const adapter = this[ $getAdapter ](adaptr)
    const Route = this[ $getRouteClass ](route)

    if (adapter && adapter.before instanceof Function) {
      const before = adapter.before(server, options)

      if (awaits(before)) {
        await before
      }
    }

    const entries = Array.isArray(paths)
      ? paths
      : paths
        ? [ paths ]
        : []

    const loading = entries.map(entry => {
      let src
      let prefix
      let branch
      let router

      if (entry instanceof Object) {
        ({ path: src } = entry)
        branch = entry
      }
      else {
        src = entry
        branch = { path: entry }
      }

      const path = Path.join(main, conf, src)

      try {
        const index = interop(require(path))
        if (index instanceof Function) {
          branch = Object.assign({ handler: index }, branch)
        }
        else if (index instanceof Object) {
          branch = Object.assign({}, index, branch)
        }
        else if (typeof index === 'string') {
          branch = { prefix: index }
        }
      }
      catch (e) {
        // no branch module
      }

      ({ prefix = '' } = branch)

      if (Router) {
        router = new Router(server, branch)
      }

      return this[ $collect ]({
        adapter,
        load,
        path,
        prefix,
        server,
        router,
        endpoints,
        Route,
        branch
      })
    })

    const routes = []
    const loaded = await Promise.all(loading)

    loaded.forEach(items => routes.push(...items))

    if (adapter && adapter.after instanceof Function) {
      const after = adapter.after(server, options)

      if (awaits(after)) {
        await after
      }
    }

    return routes
  }

  static [ $getLoader ] (loader) {
    if (!loader) {
      throw new Error('Node For Speed: loader is undefined')
    }
    else if (loader instanceof Function) {
      return loader
    }

    const id = (loader in loaders)
      ? loaders[ loader ]
      : loader

    const fn = interop(require(id))

    if (!(fn instanceof Function)) throw new Error('Node For Speed: loader module must be a function')

    return fn
  }

  static [ $getAdapter ] (arg) {
    let Class

    if (typeof arg !== 'string') {
      Class = arg
    }
    else if (arg[ 0 ] === '.') {
      Class = interop(require(Path.join(main, conf, arg)))
    }
    else {
      Class = interop(require(arg))
    }

    if (!Class) return

    if (!(Class instanceof Function || Class.handler instanceof Function)) {
      throw new Error('Node For Speed: adapter must be a function, extend node-for-speed/adapter or be an object with a handler function')
    }

    if (Class instanceof Function && Class.prototype instanceof Adapter) {
      return new Class()
    }

    return Class
  }

  static [ $getRouteClass ] (route) {
    if (!route) return Route

    let Class

    if (typeof route !== 'string') {
      Class = route
    }
    else if (route[ 0 ] === '.') {
      Class = interop(require(Path.join(main, conf, route)))
    }
    else {
      Class = interop(require(route))
    }

    if (!(Class instanceof Function && Class.prototype instanceof Route)) {
      throw new Error('Node For Speed: custom Route class must extend api-loader/Route')
    }

    return Class
  }

  static [ $getRouterClass ] (router) {
    if (!router) return

    let Class

    if (router in routers) {
      Class = interop(require(routers[ router ]))
    }
    else if (router[ 0 ] === '.') {
      Class = interop(require(Path.join(main, conf, router)))
    }
    else {
      Class = interop(require(router))
    }

    if (!(Class instanceof Function && Class.prototype instanceof Router)) {
      throw new Error('Node For Speed: router must extend node-for-speed/router')
    }

    return Class
  }

  static async [ $collect ] ({
    key = '',
    adapter,
    load,
    path,
    server,
    router,
    prefix,
    endpoints,
    parent,
    Route,
    branch
  }) {
    const items = await readdir(path)

    const routes = []
    const matchers = Object.assign({}, endpoints, branch.endpoints)
    const keys = Object.keys(matchers)

    const indexFilePath = Path.join(path, 'index.js')
    const moduleFilePath = `${ path }.js`

    const [ hasIndex, hasModule ] = await Promise.all([
      exists(indexFilePath),
      exists(moduleFilePath)
    ])

    let index
    let routePath

    if (hasModule) {
      index = interop(require(moduleFilePath))
      routePath = moduleFilePath
    }
    else if (hasIndex) {
      index = interop(require(indexFilePath))
      routePath = indexFilePath
    }
    else {
      routePath = path
    }

    const root = new Route({
      key,
      adapter,
      filepath: routePath,
      endpoint: index,
      parent,
      prefix
    })

    const loaded = await Promise.all(items.map(async item => {
      const currentPath = Path.join(path, item)
      const st = await stat(currentPath)
      const routes = []

      if (st.isDirectory()) {
        return this[ $collect ]({
          key: item,
          adapter,
          endpoints,
          load,
          server,
          prefix,
          path: currentPath,
          parent: root,
          Route,
          router,
          branch
        })
      }

      // TODO: matchers
      let matched
      const filename = item.replace(/\.js$/, '').toLowerCase()
      const endpoint = interop(require(currentPath))

      if (keys.length) {
        await keys.map(key => {
          const method = key.toLowerCase()

          if (!methods.includes(method)) return

          const conf = branch && branch.endpoints && branch.endpoints[ key ] ||  endpoints[ key ]
          let match

          if (typeof conf === 'string') {
            const lowerCased = conf.toLowerCase()

            if (filename === lowerCased) {
              match = conf
            }
          }
          else {
            let { name } = conf
            name = name || key
            const lowerCased = name && name.toLowerCase()

            if (filename === lowerCased) {
              match = name
            }
          }

          if (!match) return

          const route = new Route({
            adapter,
            key: root.key,
            filepath: currentPath,
            prefix,
            endpoint,
            parent: root,
            method,
            branch
          })

          matched = true

          routes.push(route)
          return load(server, route, adapter, router)
        })
      }

      const loadable = !matched && !endpoints[ filename ] && methods.includes(filename)

      if (loadable) {
        const method = filename
        const route = new Route({
          adapter,
          key: root.key,
          filepath: currentPath,
          prefix,
          endpoint,
          parent: root,
          method,
          branch
        })

        routes.push(route)
        load(server, route, adapter, router)
      }

      return routes
    }))

    loaded.forEach(items => routes.push(...items))

    return routes
  }

  static config (settings) {
    if (!settings) return
    let options

    const { config } = settings

    if (config) {
      const advancedPath = Path.join(main, config)

      options = {
        ...interop(require(advancedPath)),
        config
      }

      conf = Path.relative(main, Path.dirname(advancedPath))
    }
    else {
      options = settings
      conf = ''
    }

    defaults = Object.assign({}, options)
  }

  static get defaults () {
    return defaults
  }
}

module.exports = NodeForSpeed
