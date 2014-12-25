#!/bin/bash

echo "Documents App Uninstall v0.1"

echo "Are you sure to uninstall?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) echo "Continuing ..."; break;;
        No ) echo "Cancel"; exit;;
    esac
done

echo "Stopping NodeJS server ..."
sudo service documents stop

echo "Removing /etc/init/documents.conf ..."
sudo rm /etc/init/documents.conf

echo "Removing packages mongodb r-base-core nodejs-legacy npm git ..."
sudo apt-get -y remove mongodb r-base-core nodejs-legacy npm git

echo "Removing all dependencies ..."
sudo apt-get -y autoremove

echo "Removing R libraries folder ..."
rm -Rf ~/R

echo "Removing documents folder ..."
rm -Rf ~/documents 

echo "Uninstall complete"
