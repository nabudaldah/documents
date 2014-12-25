#!/bin/bash

echo "Documents App Uninstall v0.1"

if [[ "$USER" != "root" ]]; then 
	echo "Please run this script as root.";
	exit;
fi

echo "Are you sure to uninstall?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) echo "Continuing ..."; break;;
        No ) echo "Cancel"; exit;;
    esac
done

echo "Stopping NodeJS server ..."
service documents stop

echo "Removing /etc/init/documents.conf ..."
rm /etc/init/documents.conf

echo "Removing packages mongodb r-base-core nodejs-legacy npm git ..."
apt-get -y remove mongodb r-base-core nodejs-legacy npm git

echo "Removing documents folder ..."
rm -Rf /opt/documents 
rm -f  /opt/documents.log

echo "Remove dependencies?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) break;;
        No )  echo "Uninstall complete"; exit;;
    esac
done

echo "Removing all dependencies ..."
apt-get -y autoremove

echo "Uninstall complete"
