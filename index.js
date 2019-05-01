const NodeForSpeed = require('./class')
const Path = require('path')
const fs = require('fs')
const {
  existsSync,
  readFileSync
} = fs

const { config } = NodeForSpeed
const main = process.cwd()
const confFile = '.node-for-speed'
const confFilePath = Path.join(main, confFile)

let setup

if (existsSync(confFilePath)) {
  const conf = readFileSync(confFilePath, 'utf-8')
  try {
    setup = JSON.parse(conf)
  }
  catch (e) {
    throw new Error(`Node For Speed was unable to parse ${ confFilePath } as JSON`)
  }
}
else {
  const manifestPath = Path.join(main, 'package.json')

  if (existsSync(manifestPath)) {
    const manifest = require(manifestPath)
    setup = manifest[ 'node-for-speed' ]
  }
}

if (setup) {
  config(setup)
}

exports = module.exports = NodeForSpeed.load.bind(NodeForSpeed)
exports.NodeForSpeed = NodeForSpeed
exports.config = config
