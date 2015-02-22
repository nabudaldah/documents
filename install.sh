#!/bin/bash

echo ""
echo "### Documents App Installer v0.1 "
echo ""

if [[ "$USER" != "root" ]]; then 
	echo ""
	echo "### Please run this script as root.";
	echo ""
	exit;
fi

echo ""
echo "### Installing Documents App in /opt/documents ... "
echo ""

CWD=$PWD
export DEBIAN_FRONTEND=noninteractive

[ -d /opt ] || mkdir -p /opt
cd /opt

echo ""
echo "### Installing NTP time synchronization service ... "
echo ""

apt-get -q -y install ntp

echo ""
echo "### Installing MongoDB ... "
echo ""

apt-get -q -y install mongodb

echo ""
echo "### Installing NodeJS, NPM and Git ... "
echo ""

apt-get -q -y install nodejs-legacy npm git

echo ""
echo "### Installing R and OpenBLAS... "
echo ""

apt-get -q -y install --no-install-recommends r-base-core libopenblas-base

echo ""
echo "### Installing iptables-persistent ... "
echo ""

apt-get -q -y install iptables-persistent

iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
iptables-save  > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

echo ""
echo "### Cloning app from GitHub ... "
echo ""

git clone https://github.com/nabudaldah/documents.git
cd /opt/documents

echo ""
echo "### Installing bower and forever with NPM ... "
echo ""

npm install bower -g
npm install forever -g

echo ""
echo "### Installing R libraries ... "
echo ""

Rscript -e "install.packages('rmongodb', repos='http://cran.rstudio.com/')"
Rscript -e "install.packages('xts',      repos='http://cran.rstudio.com/')"

echo ""
echo "### (Re)Starting MongoDB ... "
echo ""

service mongodb restart

echo ""
echo "### Configuring NodeJS server for Upstart (init) ... "
echo ""

cp /opt/documents/init.conf /etc/init/documents.conf

echo ""
echo "### Configuring Documents App ... "
echo ""

cp /opt/documents/config.linux.json /opt/documents/config.json

echo ""
echo "### Installing NodeJS modules ... "
echo ""

cd /opt/documents
npm install

echo ""
echo "### Installing Bower modules ... "
echo ""

cd /opt/documents/pub
bower install -s --allow-root --no-interactive | xargs echo
#bower install -s --allow-root --no-interactive

echo ""
echo "### Starting Documents App ... "
echo ""

service documents start

echo ""
echo "### Creating logging symlink /opt/documents.log ... "
echo ""

ln -s /var/log/documents.log /opt/documents/documents.log

echo ""
echo "### Installation completed "
echo ""

cd $CWD
