#!/bin/bash

echo "### Documents App Installer v0.1 "

if [[ "$USER" != "root" ]]; then 
	echo "### Please run this script as root.";
	exit;
fi

echo "### Installing Documents App in /opt/documents ... "
[ -d /opt ] || mkdir -p /opt
cd /opt

echo "### Installing MongoDB ... "
apt-get -y install mongodb

echo "### Installing NodeJS, NPM and Git ... "
apt-get -y install nodejs-legacy npm git

echo "### Installing R ... "
apt-get -y install r-base-core

echo "### Cloning app from GitHub ... "
git clone https://github.com/nabudaldah/documents.git
cd /opt/documents
git pull origin
cd /opt

echo "### Installing bower and forever with NPM ... "
npm install bower -g
npm install forever -g

echo "### Installing R libraries ... "
Rscript -e "install.packages('rmongodb', repos='http://cran.rstudio.com/')"
Rscript -e "install.packages('xts',      repos='http://cran.rstudio.com/')"
#Rscript -e "install.packages('doSNOW',   repos='http://cran.rstudio.com/')"

echo "### Starting MongoDB ... "
service mongodb start

echo "### Configuring NodeJS server for Upstart (init) ... "
cp /opt/documents/init.conf /etc/init/documents.conf

echo "### Configuring Documents App ... "
cp /opt/documents/config.linux.json /opt/documents/config.json

echo "### Installing NodeJS modules ... "
cd /opt/documents
npm install

echo "### Installing Bower modules ... "
cd /opt/documents/pub
bower install

echo "### Starting Documents App ... "
service documents start

echo "### Creating logging symlink /opt/documents.log ... "
ln -s /var/log/documents.log /opt/documents/documents.log

echo "### Installation completed "
cd /opt

