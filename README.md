webdir
======

HTTP service for static contents

# Install
    sudo npm install -g webdir

# Usage
    webdir [host[,host2...]]:port[,port2,...] [other_host:other_port] [--dir=/path/to/static/files]

# Examples
Listen on port 8080 on all network interfaces including localhost
    cd /path/to/your/contents
    webdir :8080

Listen on interface 192.168.1.100 on ports 1080 and 1090 for a specific directory:
    webdir 192.168.1.100:1080,1090 --dir
