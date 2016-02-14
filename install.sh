#!/bin/bash

if [[ "$USER" != "root" ]]; then 
exit;
fi

CWD=$PWD
export DEBIAN_FRONTEND=noninteractive

[ -d /opt ] || mkdir -p /opt
cd /opt

apt-get update

apt-get -q -y install ntp

apt-get -q -y install mongodb

apt-get -q -y install nodejs-legacy npm git r-base-core libopenblas-base

apt-get -q -y install iptables-persistent

iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 3443
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport  80 -j REDIRECT --to-port 3080
iptables-save  > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

git clone https://github.com/nabudaldah/documents.git
cd /opt/documents

npm install bower -g
npm install forever -g

Rscript -e "install.packages('rmongodb', repos='http://cran-mirror.cs.uu.nl/')"
Rscript -e "install.packages('xts',      repos='http://cran-mirror.cs.uu.nl/')"

cp /opt/documents/documents.service /etc/init/documents.service

cp /opt/documents/config.template /opt/documents/config.json

cd /opt/documents
npm install

cd /opt/documents/pub
bower install -s --allow-root --no-interactive | xargs echo

systemctl daemon-reload
systemctl start documents

cd $CWD
