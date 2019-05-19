const nfs = require('../index.js')
const express = require('express')
const Path = require('path')
const Router = require('./router')
const { NodeForSpeed, config } = nfs

const empty = {}
const getRoutePath = filepath => {
  return Path.join(__dirname, 'routes', `${ filepath }.js`)
}

describe('nfs.config({...})', () => {
  it('sets the defaults as the config is set', () => {
    const { defaults } = NodeForSpeed

    config(empty)

    expect(NodeForSpeed.defaults).not.toBe(empty)
    expect(defaults).not.toBe(NodeForSpeed.defaults)
  })

  it('produces defaults equal to the passed configuration', () => {
    const conf = { random: true }

    config(conf)

    expect(NodeForSpeed.defaults).not.toBe(conf)
    expect(NodeForSpeed.defaults).toEqual(conf)
  })

  it('rejects if the loader is unknown', () => {
    config({
      loader: 'unknown-server'
    })

    expect(nfs({})).rejects.toThrow()
  })

  it('loads if the loader is known (express)', async () => {
    expect.assertions(1)
    const app = express()

    config({
      loader: 'express'
    })

    const routes = await nfs(app)
    expect(routes).toBeInstanceOf(Array)
  })
})

describe('nfs(server)', () => {
  describe('first', () => {
    it('loads individual files named as methods as endpoints', async () => {
      const app = express()
      config({
        paths: './test/routes/1'
      })

      const routes = await nfs(app)
      expect(routes).toHaveLength(2)
    })

    it('loads endpoints from all the provided paths', async () => {
      const app = express()
      config({
        paths: [
          './test/routes/1',
          './test/routes/2'
        ]
      })

      const routes = await nfs(app)
      expect(routes).toHaveLength(4)
    })

    it('loads endpoints in a router per branch', async () => {
      const app = express()
      config({
        paths: [
          './test/routes/1',
          './test/routes/2'
        ],
        router: './test/router'
      })

      await nfs(app)
      expect(Router.spy).toHaveBeenCalledTimes(2)
    })

    it('loads method endpoints matching configured filename', async () => {
      const app = express()
      config({
        paths: [
          {
            path: './test/advanced',
            endpoints: {
              post: 'index',
              get: { name: 'index' }
            }
          }
        ]
      })

      const routes = await nfs(app)
      expect(routes).toHaveLength(2)
    })

    it('loads branches as modules', async () => {
      const app = express()

      config({
        paths: './test/branch'
      })

      const routes = await nfs(app)
      expect(routes).toHaveLength(2)
    })

    it('forwards server and route to the handler function an instanciated Adapter object if provided', async () => {
      const app = express()
      config({
        paths: './test/routes/1',
        adapter: './test/adapter/class'
      })

      // TODO: refactor testing method
      const Adapter = require('./adapter/class')
      await nfs(app)

      expect(Adapter.spy).toHaveBeenCalledTimes(2)
    })

    it('forwards server and route to the handler function of an adapter object if provided', async () => {
      const app = express()
      config({
        paths: './test/routes/1',
        adapter: './test/adapter/object'
      })

      const adapter = require('./adapter/object')
      await nfs(app)

      expect(adapter.spy).toHaveBeenCalledTimes(2)
    })

    it('forwards server and route to an adapter function if provided', async () => {
      const app = express()
      config({
        paths: './test/routes/1',
        adapter: './test/adapter/function'
      })

      const adapter = require('./adapter/function')
      await nfs(app)

      expect(adapter.spy).toHaveBeenCalledTimes(2)
    })

    // TODO: test Route
  })

  describe('then', () => {
    let routes
    const map = {}

    const getRoute = path => {
      const key = getRoutePath(path)
      return map[ key ]
    }

    beforeAll(async () => {
      const app = express()

      config({
        paths: './test/routes'
      })

      routes = await nfs(app)
      routes.forEach(route => {
        map[ route.filepath ] = route
      })
    })

    it('loads endpoints building paths from folders', () => {
      const get = getRoute('1/get')
      expect(get.path).toBe('1')
    })

    it('replaces folder names with the index file path', () => {
      const get = getRoute('2/nested/get')
      expect(get.path).toBe('params/nested')
    })

    it('overwrites an endpoint folder name using ~/* as endpoint path', () => {
      const get = getRoute('3/nested/get')
      const post = getRoute('3/nested/post')

      expect(get.path).toBe('3/rewrite')
      expect(post.path).toBe('3/nested')
    })

    it('replaces built path with url if provided', () => {
      const get = getRoute('4/nested/nested/get')
      expect(get.path).toBe(get.endpoint.url)
    })
  })
})
