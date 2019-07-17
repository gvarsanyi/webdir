webdir
======

HTTP service for static contents

# Install
`sudo npm install -g webdir`

# Usage
`webdir [start|stop|status] options [host] [host2]`

# Options
`-d=PATH` `--dir=PATH`            path to web root (defaults to current working directory)
`-h` `--help`                     help
`-n` `--no-index`                 don't show directory index if index.html is missing in a folder
`-s` `--single-page-application`  redirects all 404s to index.html of webroot
`-v` `--version`                  version info

# Host syntax
Host can be an interface name (${Object.keys(networkInterfaces()).join(' ')}), IP (both v4 and v6)
address or a hostname, but it must be bound to a local interface.
Default: localhost:8080

# Simplest example
Listen on port 8080 on all network interfaces including localhost
`cd /path/to/your/contents`
`webdir start`
`webdir status`
`webdir stop`
