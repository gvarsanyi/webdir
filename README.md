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
Use `*` to listen on all interfaces.
Default: localhost:8080

# Example 1: workflow for default port (8080) on the default host (localhost)
`cd /path/to/your/contents`

`webdir start`

`webdir status`

`webdir stop`

# Example 2: listen on all interfaces and port 4200, use a different directory
`webdir start --dir=../other/dir *:4200`

# Example 3: listen on multiple addresses
Use localhost and map all addresses for eth0, all on port 8080
`webdir start localhost:8000 eth0:8000`
