# socketChat

socketChat is a beautifully designed secure messaging application. It was built with [Express](https://expressjs.com/) and [Socket.io](https://socket.io).
 <!-- ## Demo:
##### Login demo:
![login screen demo](demo_login.png) -->

![socketChat demo](socketChat-demo.png)

## Run
If you'd like to run this app via `http` or  `https`:
### Debian 10
This script will install a system user and group for tighter security, also installs a systemd file for reboots, and copies self-specified certs into source dir for https. This script does not address apache2/nginx https setup.
```
git clone https://github.com/abdullah-K/socketChat /usr/src/socketChat
cd /usr/src/socketChat && bash install.sh
```
Start/stop service with `systemctl start socketchat` and visit [localhost:4000](http://localhost:4000)
If you have domain SSL/TLS certificates installed then try [https://<domain.com>:4000]()

### Manually
```
git clone https://github.com/abdullah-K/socketChat
npm i --unsafe-perm node-sass  # debian buster needed this
npm install
node ./node_modules/gulp/bin/gulp.js
```
Create a `.env` file in your cloned directory containing this:
```
SESSIONSECRET="putyoursessionsecrethere"
```
Now your ready to run locally
```
node index.js
```

#### Going Futher
Note: replace `<src_dir>` with your source directory location

If you have LetsEncrypt SSL certs (or equivalents from a CA), also add to `.env` file:
```
PRIVKEY="<src_dir>/tls/privkey.pem"
CERT="<src_dir>/tls/cert.pem"
FULLCHAIN="<src_dir>/tls/fullchain.pem
```
And then copy/rename your certs respectively into `<src_dir>/tls`

For socketchat system user and permission:
```
groupadd socketchat
adduser --quiet --system --home  <src_dir> --ingroup socketchat socketchat --disabled-password
chown -R socketchat:socketchat <src_dir>
```
To survive reboots try something like this:
`/usr/lib/systemd/system/socketchat.service`
```
[Unit]
Description=socketChat systemd service file
Wants=network-online.target
Requires=network.target
After=network.target network-online.target

[Service]
WorkingDirectory=<src_dir>
User=socketchat
Group=socketchat
Restart=always
ExecStart=/usr/bin/node <src_dir>/index.js

[Install]
WantedBy=multi-user.target
```
followed by these commands
```
chmod 664 /lib/systemd/system/socketchat.service
systemctl daemon-reload
systemctl enable socketchat.service
systyemctl start socketchat
```
Have fun chatting with people, optionally with encryption!
