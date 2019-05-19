module.exports = {
  prefix: '',
  handler: (req, res, next) => {
    /* eslint-disable-next-line */
    console.log(`${ req.method } ${ req.originalUrl }`)
    next()
  }
}
