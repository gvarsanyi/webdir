express = require 'express'


serve = ->
  app = express()

  dir = process.cwd()
  port = process.argv[2] or 1080

  app.configure ->
    app.use express.compress threshold: 128
    app.use express.static dir
    app.use express.directory dir
    app.use express.errorHandler()

  server = app.listen port, (err) ->
    console.log 'listening @ port ' + port

serve()
