source_dir="/usr/src/socketChat"
secret=""
privkey=""
cert=""
fullchain=""

read -d . version < /etc/debian_version
if [ "$version" -eq 10 ]; then
    RELEASE="buster"
elif [ "$version" -eq 9 ]; then
    RELEASE="stretch"
else
    printf "\nERROR: OS not suitable for this script. Use Debian 9 or 10, or modify this script yourself... exiting script...\n"
    exit 0
fi

if [ ! -d "${source_dir}" ]; then
    printf "\nERROR: source code need to be cloned to ${source_dir} for this script to work... exiting...\n"
    exit 0
else
    mkdir -p ${source_dir}/tls
fi

if [ ! "${secret}" ]; then
    printf "\nPlease type in some long random characters (like more than 16) for session secret\n"
    printf "You will not need to memorize this, it's used internally on the server\n"
    read -p "secret: " r_secret
    secret="${r_secret:-putyoursessionsecrethere}"
    printf "SESSIONSECRET=%s\n" "${secret}" > ./.env    
else
    printf "SESSIONSECRET=${secret}\n" > ./.env    
fi

if [ ! "${privkey}" ];  then
    printf "\nwhat is your full path to SSL private key? or just hit enter to leave blank\n"
    read -p "Key: " r_privkey
    privkey="${r_privkey}"
    printf "PRIVKEY=%s\n" "${privkey}" >> ./.env
else
    printf "PRIVKEY=%s/tls/privkey.pem\n" "${source_dir}" >> ./.env
fi

if [ ! "${cert}" ]; then
    printf "\nwhat is your full path to SSL cert? or just hit enter to leave blank\n"
    read -p "Cert: " r_cert
    cert="${r_cert}"
    printf "CERT=%s\n" "${cert}" >> ./.env
else
    printf "CERT=%s/tls/cert.pem\n" "${source_dir}" >> ./.env
fi

if [ ! "${fullchain}" ]; then
    printf "\nwhat is your full path to SSL Full Chain? or just hit enter to leave blank\n"
    read -p "Fullchain: " fullchain
    fullchain="${r_fullchain}"
    printf "FULLCHAIN=%s\n" "${fullchain}" >> ./.env
else
    printf "FULLCHAIN=%s/tls/fullchain.pem\n" "${source_dir}" >> ./.env
fi

if [ ${privkey} ] && [ ${cert} ] && [ ${fullchain} ]; then
    cp ${privkey} ${source_dir}/tls/privkey.pem
    cp ${cert} ${source_dir}/tls/cert.pem
    cp ${fullchain} ${source_dir}/tls/fullchain.pem
else
    printf "no certs specified... not doing https...\n"
fi
		    npm i --unsafe-perm node-sass
npm install
node ./node_modules/gulp/bin/gulp.js
npm update
npm audit fix

scgroup=$( awk -F':' '/^socketchat/{print $1}' /etc/group )
if [ ! ${scgroup} ]; then
    groupadd socketchat
else
    printf "group socketchat already exists...\n"
fi
    
scuser=$( awk -F':' '/^socketchat/{print $1}' /etc/passwd )
if [ ! ${scuser} ]; then
    adduser --quiet --system --home ${source_dir} --gecos "socketChat open source chat software" --ingroup socketchat socketchat --disabled-password
else
    printf "user socketchat already exists...\n"
fi
    
if [ ! -f /lib/systemd/system/socketchat.service ]; then
    cat > /lib/systemd/system/socketchat.service <<EOF
[Unit]
Description=socketChat systemd service file
Wants=network-online.target
Requires=network.target
After=network.target network-online.target

[Service]
WorkingDirectory=${source_dir}
User=socketchat
Group=socketchat
Restart=always
ExecStart=/usr/bin/node ${source_dir}/index.js

[Install]
WantedBy=multi-user.target
EOF
else
    printf "socketchat.service file already exists... continuing...\n"
fi

chown -R socketchat:socketchat ${source_dir}
chmod 664 /lib/systemd/system/socketchat.service
systemctl daemon-reload
systemctl enable socketchat.service

message () {
    printf "waiting for server to start...\n"
    sleep 2
    if [ $(systemctl status socketchat | grep -c active) -gt 0 ]; then
	if [ ${privkey} ]; then
	    printf "\nsocketChat should be running on https://<domain.com>:4000\n\n"
	else
	    printf "\nsocketChat should be running on http://localhost:4000\n\n"
	fi
    else
	journalctl -e
    fi
}
systemctl start socketchat && message
