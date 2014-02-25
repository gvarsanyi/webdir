#!/usr/bin/env node

(function() {
  var express, serve;

  express = require('express');

  serve = function() {
    var app, dir, port, server;
    app = express();
    dir = process.cwd();
    port = process.argv[2] || 1080;
    app.configure(function() {
      app.use(express.compress({
        threshold: 128
      }));
      app.use(express["static"](dir));
      app.use(express.directory(dir));
      return app.use(express.errorHandler());
    });
    return server = app.listen(port, function(err) {
      return console.log('listening @ port ' + port);
    });
  };

  serve();

}).call(this);
