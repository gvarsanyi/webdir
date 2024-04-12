webdir
======

HTTP service for static contents

# Install
## As global app
`sudo npm install -g webdir`

## For your project
`sudo npm install webdir`

# CLI use
## Help
`webdir help`

## Run service
`webdir start [ADDRESS ...] [mount [URL_PATH] [FS_PATH]] [--no-index] [--single-page-application] [--output=PATH]`

### Arguments

#### ADDRESS
Host and port specification.
Host can be interface name, IPv4, IPv6, a hostname, or "all" for all local interfaces. Default: "localhost".
Port is an integer between 1 and 65535 inclusive. Default: 8080. Ports under 1024 might need priviliged access.
You may provide multiple addresses.
Examples:
- `webdir start` = IP: local loop device's IPv4 and IPv6, port: `8080`
- `webdir start localhost:8001` = IP: local loop device's IPv4 and IPv6, port: `8001`
- `webdir start 8000` = IP: local loop device's IPv4 and IPv6, port: `8000`
- `webdir start eth0` = IP: ethernet device's IPv4 and IPv6, port: `8080`
- `webdir start 127.0.0.1` = host: `127.0.0.1`, port: `8080`
- `webdir start ::1` = host: `::1` (local IPv6), port: `8080`
- `webdir start [::1]:10001` = host: `::1` (local IPv6), port: `10001`
- `webdir start all` = host: all local IPs, port: `8080`

#### mount / unmount
Add or remove association between URL path and file system path.
You may specify multiple associations.
If a URL path is associated with multiple file system paths, it will serve both as if they were merged.

##### URL_PATH
HTTP path of the mount/unmount spec. Required. Must start with "/"

##### FS_PATH
File system path component of a mount or unmount spec. Defaults to current working directory when omitted.

Examples:
- `webdir start` = will mount root URL path `/` to current working directory
- `webdir start mount /xx` = will mount URL path `/xx` to current working directory
- `webdir start mount /xx /my/dir` = will mount URL path `/xx` to `/my/dir`

#### Configuration arguments
`-n` or `--no-index`
No directory index if index.html is missing in a folder

`--index`
Negate previously set no index (`-n` or `--no-index`) mode

`-o=LOGFILE` or `--output=LOGFILE`
Specify log file. Will use append mode. Pass empty string to turn off logging

`--no-output`
Turns off logging

`-s`, `--spa`, `--single-page-app`, or `--single-page-application`
Redirect all not found (404) to `/index.html`.

`--no-spa`, `--no-single-page-app`, or `--no-single-page-application`
Negate previously set single page application mode

## Get status of service
`webdir status [ADDRESS ...]`

## Stop service
`webdir stop [ADDRESS ...]`

## Get Webdir version
`webdir version`
