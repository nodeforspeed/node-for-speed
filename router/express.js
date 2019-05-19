const Router = require('.')
const express = require('express')

class ExpressRouter extends Router {
  constructor (server, branch) {
    super(server, branch)

    const router = this.router = express.Router()
    this.init(server, router, branch)
  }

  init (server, router, branch = {}) {
    const { prefix = '', handler } = branch
    const hasMiddleware = (handler instanceof Function || Array.isArray(handler))

    hasMiddleware
      ? server.use(prefix, handler, router)
      : server.use(prefix, router)
  }

  handler (route) {
    const { router } = this
    const { path, method, handler } = route

    Array.isArray(handler)
      ? router[ method ](path, ...handler)
      : router[ method ](path, handler)
  }
}

module.exports = ExpressRouter
