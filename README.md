# [Node For Speed](https://nodeforspeed.github.io/)
> Easy API endpoint management

Getting started
---------------
> `npm install node-for-speed`

```javascript
const express = require('express')
const nfs = require('node-for-speed')
const server = express()

// ...

await nfs(server)

/*
api/
├── v1/
│   ├── route/
│   │   ├── get.js  => GET api/v1/route
│   │   └── post.js => POST api/v1/route
│   └── ...
└── ...
 */
```

# Usage

```javascript
const nfs = require('node-for-speed')
// ...
await nfs(server, config)

// OR

const { NodeForSpeed } = require('node-for-speed')
// ...
await NodeForSpeed.load(server, config)
```
Where `config` is an optional parameter to be "assigned" to your main configuration for the given execution.

# Configuration

### programmatic

```javascript
NodeForSpeed.config({
  loader: 'express', // optional
  router: 'express', // optional
  paths: [
    'path/to/routes',
    {
      path: 'path/to/other/routes',
      prefix: 'v1' // optional
    }
  ],
  adapter: 'path/to/adapter', // optional
  route: 'path/to/route' // optional
})
```

All paths passed to the config are relative to your project working directory.

#### `loader` (String)

Built in server loader, path to your loader or loader module name.
<br />
<br />
Available loaders: `express` <br />
Default: `express`

#### `router` (String)

Built in router, path to your router or router module name. See [Router](#customization-router) for more details.
<br />
<br />
Available routers: `express` <br />
Default: `null`

#### `paths` (String | Object | Array)

Paths to directories containing your endpoints as a string, a branch object (cf. example) or an array containing any of the two. <br />
Every string will be converted into branch.

```javascript
// branch
{
  path: 'path/to/your/routes',
  prefix: 'v1' // optional
}
```

#### `adapter` (String)

Path to a custom function, object or Adapter class. See [Adapter](#customization-adapter) for more details.

#### `route` (String)

Path to a custom Route class. See [Route](#customization-route) for more details.

### `.node-for-speed` file

If provided as JSON, the `.node-for-speed` file will be loaded automatically as the node-for-speed module is called. 

### package.json

If provided, the `"node-for-speed"` property of your package.json file will be automatically loaded as the node-for-speed module is called. The `.node-for-speed` file has a higher priority.

### as module

The configuration can be auto-loaded from a module on startup using a config property in either of the two previous cases:

```javascript
{
  config: 'path/to/configuration'
}
```

Then:

```javascript
module.exports = {
  /* your config in js */
}
```

# Endpoint

Endpoints are simple modules named after the method they address:
```javascript
// ./api/v1/anything/get.js

module.exports = {
  path: 'new', // optional
  handler: (request, response) => {
    /* ... */
  }
}

// with path
// => GET api/v1/anything/new

// without path
// => GET api/v1/anything
```

Folder names can be overridden using an index.js file (useful for url params):

```javascript
// ./api/v1/anything/index.js

module.exports = 'something'

// OR

module.exports = {
  path: 'something'
}

// will cause the example above to become
// => GET api/v1/something/new
```

An endpoint can override a folder name using ~ :

```javascript
// ./api/v1/anything/get.js

module.exports = {
  path: '~/brand/new',
  handler: (request, response) => {
    /* ... */
  }
}

// => GET api/v1/brand/new
```

An endpoint url can be set manually as follow:
```javascript
// ./api/v1/nested/route/with/a/twist/get.js

module.exports = {
  url: 'api/v1/boom',
  handler: (request, response) => {
    /* ... */
  }
}

// => GET api/v1/boom
// instead of
// => GET api/v1/nested/route/with/a/twist
```
# Customization

## Loader
A loader defines how a route is mounted on your server (or router) and delegates the task an adapter if provider.

```javascript
module.exports = (server, route, adapter, router) => {
  /* ... */
}
```

## Router
The `Router` class allows you to define:

- how a router is built based on your configuration
- how a router is attached to your server
- how a route is mounted

```javascript
class Router {
  constructor (server, branch) {
    /* ... */
  }

  handler (route) {
    /* ... */
  }
}
```

## Route

The purpose of the `Route` class is to build your endpoints' path and allow you to extend them as shown in [example](#customization-example). 

```javascript
class Route {
  constructor ({
    adapter,  // optional
    key,      // current path section
    filepath, // endpoint location
    prefix,   // optional path prefix
    endpoint, // actual endpoint
    parent,   // parent route
    method,   // rest method
    branch    // branch configuration
  }) {
    /* ... */
  }
}
```
A route has the following properties:

#### path
The complete endpoint path.

#### handler
The endpoint's handler.

#### key
The name of the folder containing the endpoint. 

#### prefix
The prefix to prepend to the path.

#### endpoint
The actual endpoint.

#### parent
The parent route object.

#### method
The rest method addressed (lowercase).

#### filepath
The endpoint file location.

## Adapter

An adapter customizes the way a route is mounted on your server. It is defined as:

```javascript
class Adapter {
  before (server, options) {
    /* ... */
  }

  handler (server, route, router) {
    /* ... */
  }

  after (server, options) {
    /* ... */
  }
}
```
`before(server, options)` and `after(server, options)` are optional methods called respectively pre and post loading.
<br />
<br />
In this context `options` is defined as:
```javascript
// Given
NodeForSpeed.config(defaults)
// And
NodeForSpeed.load(server, config)
// Then
options = Object.assign({}, defaults, config)
```

Given the optional nature of `before` and `after`, adapters can be expressed under any of the following forms:

```javascript
// as a function
module.exports = (server, route, router) => { /* ... */ }
```
```javascript
// as an object
module.exports = {
  before: (server, options) => { // optional
    /* ... */
  },
  handler: (server, route, router) => {
    /* ... */
  },
  after: (server, options) => { // optional
    /* ... */
  }
}
```
```javascript
// as a class extending Adapter
module.exports = class CustomAdapter extends Adapter {
  /* ... */
}
```

## Example

In this example, we will customize node-for-speed to attach middlewares to our endpoints given the following project structure:

```
project/
├── ...
├── custom/
├── middlewares/
├── routes/
│   ├── admin/
│   │   └── ...
│   ├── private/
│   │   └── ...
│   └── public/
│       └── ...
├── ...
├── index.js
├── package.json
├── routes.js
└── ...
```

### Endpoint

Endpoints will be written under the form:

```javascript
const middleware = require('path/to/middleware')

module.exports = {
  use: middleware,
  // OR
  use: [ middleware ],
  handler: (request, response) => {
    /* ... */
  }
}
```

### Route 

There is no need to extend the Route class in this example. <br /><br />
But if, for instance, we wanted to define the middlewares by name rather than by actually attaching them to our endpoints, we would write:

```javascript
const Route = require('node-for-speed/route')

class MiddlewareRoute extends Route {
  constructor (args) {
    super(args)

    const { endpoint } = args
    const { use } = endpoint
    const middlewares = Array.isArray(use) ? use : [ use ]

    this.use = middlewares.map(this.getMiddleware)
  }

  getMiddleware (name) {
    /* ... */
  }
}

module.exports = MiddlewareRoute
```

Our endpoints would then become:

```javascript
module.exports = {
  use: 'middleware',
  // OR
  use: [ 'middleware' ],
  handler: (request, response) => {
    /* ... */
  }
}
```

### Router

As we want apply prefix and middlewares at a branch level, we will have the following Router:

```javascript
const ExpressRouter = require('node-for-speed/router/express')

class MiddlewareRouter extends ExpressRouter {
  init (server, router, branch = {}) {
    const {
      prefix = '',
      use
    } = branch

    if (use instanceof Function || use instanceof Array) {
      server.use(prefix, use, router)
    }
    else {
      server.use(prefix, router)
    }
  }

  handler (route) {
    const { router } = this
    const { path, method, handler, parent, endpoint } = route
    const middlewares = []

    // get index middlewares
    const indexwares = this.getMiddlewares(parent.endpoint)
    // get the method middlewares
    const methodwares = this.getMiddlewares(endpoint)

    if (indexwares.length) {
      middlewares.push(...indexwares)
    }

    if (methodwares.length) {
      middlewares.push(...methodwares)
    }

    if (middlewares.length) {
      router[ method ](path, middlewares, handler)
    }
    else {
      router[ method ](path, handler)
    }
  }

  getMiddlewares ({ use } = {}) {
    const middlewares = []
    if (use instanceof Function) {
      middlewares.push(use)
    }
    else if (use instanceof Array) {
      middlewares.push(...use)
    }

    return middlewares
  }
}

module.exports = MiddlewareRouter
```
In the scenario exposed in the [Route](#customization-example-route) section, we would have passed `route` and `parent` to `getMiddlewares` rather than the endpoints.

### Adapter
Let's add error handlers to our server:

```javascript
module.exports = {
  after: server => {
    // 404 handler

    server.use((request, response, next) => {
      response.status(404).send('Page not found')
    })

    // error handler

    server.use((err, request, response, next) => {
      /* ... */
      response.status(500).send('Something went wrong...')
    })
  }
}
``` 
### Configuration
#### package.json
```javascript
{
  // ...
  "node-for-speed": { config: "./routes.js" }
  // ...
}
```
We load the configuration through a module to import middlewares.
#### routes.js
```javascript
const isAuthenticated = require('./middlewares/authenticated')
const isAdmin = require('./middlewares/admin')

module.exports = {
  adapter: './custom/adapter',
  router: './custom/router',
  paths: [
    {
      path: './public'
    },
    {
      path: './private',
      use: isAuthenticated
    },
    {
      path: './admin',
      prefix: '/admin',
      use: [ isAuthenticated, isAdmin ]
    }
  ]
}
```
#### index.js
```javascript
const express = require('express')
const nfs = require('node-for-speed')
const app = express()

/* ... */

nfs(app).then(() => app.listen(3000))

/* ... */
```

Roadmap
=======

In progress
-----------
- code sample
- openapi path parameters
- swagger generated API documentation

Planned
-------
- static endpoints (e.g. routes/404.html)
- document custom endpoint filenames
- Built-in loaders: koa, hapi
- rest file

```javascript
// ./api/v1/anything/rest.js

module.exports = {
  index (params) { // GET api/v1/anything

  },
  get (id, params) { // GET api/v1/anything/:id

  },
  post (id, data, params) { // POST api/v1/anything/:id

  },
  put (id, data, params) { // PUT api/v1/anything/:id

  },
  patch (id, data, params) { // PATCH api/v1/anything/:id

  },
  delete (id, data, params) { // DELETE api/v1/anything/:id

  },
  procedure (id, data, params) { // POST api/v1/anything/:id/procedure

  }
}
```
