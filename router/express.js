const Router = require('.')
const express = require('express')
const $router = Symbol('router')

class ExpressRouter extends Router {
  constructor (server) {
    super()

    const router = this[ $router ] = express.Router()
    server.use(router)
  }

  handler (route) {
    const router = this[ $router ]
    const { prefix, path, method, handler } = route

    router[ method ](`${ prefix }/${ path }`, handler)
  }
}

module.exports = ExpressRouter
