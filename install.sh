#!/bin/bash

echo -e "\x1B[01;94m Documents App Installer v0.1 \x1B[0m"
#echo "Documents App Installer v0.1"

echo -e "\x1B[01;94m Changing to home folder ... \x1B[0m"
#echo "Changing to home folder ..."
cd ~

echo -e "\x1B[01;94m Installing MongoDB ... \x1B[0m"
#echo "Installing MongoDB ..."
sudo apt-get -y install mongodb

echo -e "\x1B[01;94m Installing NodeJS, NPM and Git ... \x1B[0m"
#echo "Installing NodeJS, NPM and Git ..."
sudo apt-get -y install nodejs-legacy npm git

echo -e "\x1B[01;94m Installing R ... \x1B[0m"
#echo "Installing R ..."
sudo apt-get -y install r-base-core

echo -e "\x1B[01;94m Cloning app from GitHub ... \x1B[0m"
#echo "Cloning app from GitHub ..."
git clone https://github.com/nabudaldah/documents.git
cd ~/documents
git pull origin
cd ~

echo -e "\x1B[01;94m Installing bower and forever with NPM ... \x1B[0m"
#echo "Installing bower and forever with NPM ..."
sudo npm install bower -g
sudo npm install forever -g

echo -e "\x1B[01;94m Installing R libraries ... \x1B[0m"
#echo "Installing R libraries ..."
sudo Rscript -e "install.packages('rmongodb', repos='http://cran.rstudio.com/')"
sudo Rscript -e "install.packages('xts',      repos='http://cran.rstudio.com/')"
#sudo Rscript -e "install.packages('doSNOW',   repos='http://cran.rstudio.com/')"

echo -e "\x1B[01;94m Starting MongoDB ... \x1B[0m"
#echo "Starting MongoDB ..."
sudo service mongodb start

echo -e "\x1B[01;94m Configuring NodeJS server for Upstart (init) ... \x1B[0m"
#echo "Configuring NodeJS server for Upstart (init) ..."
REPLACE="s/user/$USER/g"
sudo cp ~/documents/init.conf /etc/init/documents.conf
sudo sed -i $REPLACE /etc/init/documents.conf

echo -e "\x1B[01;94m Configuring Documents App ... \x1B[0m"
#echo "Configuring Documents App ..."
REPLACE="s/user/$USER/g"
sed $REPLACE ~/documents/config.linux.json > ~/documents/config.json

echo -e "\x1B[01;94m Installing NodeJS modules ... \x1B[0m"
#echo "Installing NodeJS modules ..."
cd ~/documents
npm install

echo -e "\x1B[01;94m Installing Bower modules ... \x1B[0m"
#echo "Installing Bower modules ..."
cd ~/documents/pub
bower install

echo -e "\x1B[01;94m Starting Documents App ... \x1B[0m"
#echo "Starting Documents App ..."
sudo service documents start

echo -e "\x1B[01;94m Creating logging symlink ~/documents.log ... \x1B[0m"
ln -s /var/log/documents.log ~/documents.log

echo -e "\x1B[01;94m Installation completed \x1B[0m"
#echo "Installation completed"
cd ~

