let defaults = {}
const main = process.cwd()
const Path = require('path')
const fs = require('fs')
const { promisify } = require('util')

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

const Adapter = require('../adapter')
const Route = require('../route')
const methods = require('../lib/methods')
const exists = require('../lib/exists')
const awaits = require('../lib/awaits')

const $collect = Symbol('collect')
const $getLoader = Symbol('getLoader')
const $getAdapter = Symbol('getAdapter')
const $getRouteClass = Symbol('getRouteClass')

const loaders = {
  express: '../server/express'
}

class NodeForSpeed {
  static async load (server, opt = {}) {
    const options = Object.assign({}, defaults, opt)
    const {
      adapter: adaptr,
      endpoints = {},
      loader = 'express',
      paths,
      route
    } = options

    const load = this[ $getLoader ](loader)
    const [ adapter, Route ] = await Promise.all([
      this[ $getAdapter ](adaptr),
      this[ $getRouteClass ](route)
    ])

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
      let settings

      if (!(entry instanceof Object)) {
        src = entry
        prefix = ''
        settings = { path: entry }
      }
      else {
        ({ path: src, prefix = '' } = entry)
        settings = entry
      }

      const path = Path.join(main, src)

      return this[ $collect ]({
        adapter,
        load,
        path,
        prefix,
        server,
        endpoints,
        Route,
        settings
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

    const fn = (loader in loaders)
      ? require(loaders[ loader ])
      : require(loader)

    if (!(fn instanceof Function)) throw new Error('Node For Speed: loader module must be a function')

    return fn
  }

  static async [ $getAdapter ] (arg) {
    let Class

    if (typeof arg !== 'string') {
      Class = arg
    }
    else {
      const path = Path.join(main, arg)
      const usePath = arg[ 0 ] === '.' || await exists(path)

      Class = usePath
        ? require(path)
        : require(arg)
    }

    if (!Class) return

    if (!(Class instanceof Function || Class.handler instanceof Function)) {
      throw new Error('Node For Speed: adapter must be a function, Adapter class or an object with a handler function')
    }

    if (Class instanceof Function && Class.prototype instanceof Adapter) {
      return new Class()
    }

    return Class
  }

  static async [ $getRouteClass ] (route) {
    if (!route) return Route

    let Class

    if (typeof route !== 'string') {
      Class = route
    }
    else {
      const routePath = Path.join(main, route)
      const hasRoute = await exists(routePath)

      Class = hasRoute
        ? require(routePath)
        : require(route)
    }

    if (!(Class instanceof Function && Class.prototype instanceof Route)) {
      throw new Error('Node For Speed: custom Route class must extend api-loader/Route')
    }

    return Class
  }

  static async [ $collect ] ({
    key = '',
    adapter,
    load,
    path,
    server,
    prefix,
    endpoints,
    parent,
    Route,
    settings
  }) {
    const items = await readdir(path)

    const routes = []
    const matchers = Object.assign({}, endpoints, settings.endpoints)
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
      index = require(moduleFilePath)
      routePath = moduleFilePath
    }
    else if (hasIndex) {
      index = require(indexFilePath)
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
          settings
        })
      }

      // TODO: matchers
      let matched
      const filename = item.replace(/\.js$/, '').toLowerCase()
      const endpoint = require(currentPath)

      if (keys.length) {
        await keys.map(key => {
          const method = key.toLowerCase()

          if (!methods.includes(method)) return

          const conf = settings && settings.endpoints && settings.endpoints[ key ] ||  endpoints[ key ]
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
            settings
          })

          matched = true

          routes.push(route)
          return load(server, route, adapter)
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
          settings
        })

        routes.push(route)
        load(server, route, adapter)
      }

      return routes
    }))

    loaded.forEach(items => routes.push(...items))

    return routes
  }

  static config (settings) {
    if (!settings) return

    const { config } = settings

    if (config) {
      const advancedPath = Path.join(main, config)
      settings = require(advancedPath)
    }

    defaults = Object.assign({}, settings)
  }

  static get defaults () {
    return defaults
  }
}

module.exports = NodeForSpeed
