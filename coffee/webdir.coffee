fs   = require 'fs'
http = require 'http'
os   = require 'os'
path = require 'path'

express     = require 'express'
serve_index = require 'serve-index'
minimist    = require 'minimist'

args = minimist process.argv[2 ...]

class App
  constructor: (@dir) ->
    @dir = path.resolve @dir
    console.log '[webroot]', @dir

    try
      stat = fs.statSync @dir
    unless stat?.isDirectory()
      console.error '[not-a-isDirectory]', @dir
      return process.exit 1

    @app = express()
    @app.use '/', express.static @dir
    @app.use '/', serve_index @dir, icons: true

    @ifaces = []
    for name, arr of os.networkInterfaces()
      for inf in arr when inf.family is 'IPv4'
        @ifaces.push inf.address


class Server
  @pool = {}

  constructor: (@app, @iface, @port) ->
    @id = @iface + ':' + @port
    Server.pool[@id] = @
    console.log '[opening]', @id
    @retries = 0
    @connect()

  connect: =>
    @timeout = null
    if @retries >= 3
      console.error '[giving-up]', @id
      delete Server.pool[@id]
      unless Object.keys(Server.pool).length
        console.log '[exit] no service is listening'
        process.exit 1
      return

    @server = http.createServer @app.app
    @server.listen @port, @iface, =>
      @retries = 0
      console.log '[listening]', @id

    @server.on 'error', (err) =>
      unless @timeout
        @retries += 1
        console.log '[error]', @id, err.code, '(retrying in 2 seconds)'
        @timeout = setTimeout @connect, 2000

    @server.on 'close', =>
      unless @timeout
        @retries += 1
        console.log '[closed]', @id, '(reopening in 2 seconds)'
        @timeout = setTimeout @connect, 2000


class Boot
  constructor: ->
    app = new App args.dir or args.d or process.cwd()
    for id in args._
      [iface, port] = id.split ':'
      iface = iface or args.iface or args.i or '*'
      if iface is '*'
        ifaces = app.ifaces
      else
        ifaces = iface.split ','
      ports = (port or args.port or args.p or '1080').split ','
      for _iface in ifaces
        for _port in ports when not Server.pool[_iface + ':' + _port]
          new Server app, _iface, _port

new Boot

unless Object.keys(Server.pool).length
  console.error '[exit] missing interface or port spec'
  process.exit 1
