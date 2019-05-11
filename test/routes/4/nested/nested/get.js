module.exports = {
  url: '5/stars',
  handler: [
    (request, response, next) => {
      request.value = 'ok'
      next()
    },
    ({ value }, response) => {
      response.send(value)
    }
  ]
}
