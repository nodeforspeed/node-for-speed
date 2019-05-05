const ExpressRouter = require('../../router/express')

class TestRouter extends ExpressRouter {
  constructor (server, settings) {
    super(server, settings)
    TestRouter.spy()
  }
}

TestRouter.spy = jest.fn()

module.exports = TestRouter
