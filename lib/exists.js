const fs = require('fs')
const { access } = fs

module.exports = function exists (filePath) {
  return new Promise(resolve => access(filePath, fs.constants.F_OK, err => resolve(err ? false : true)))
}
