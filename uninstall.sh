#!/bin/bash

echo ""
echo "### Documents App Uninstall v0.1"
echo ""

if [[ "$USER" != "root" ]]; then 
	
	echo ""
	echo "### Please run this script as root.";
	echo ""

	exit;
fi

echo ""
echo "### Are you sure to uninstall?"
echo ""

echo "Are you sure to uninstall?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) echo "### Continuing ..."; break;;
        No ) echo "### Cancel"; exit;;
    esac
done

echo ""
echo "### Stopping NodeJS server ..."
echo ""

service documents stop

echo ""
echo "### Removing /etc/init/documents.conf ..."
echo ""

rm /etc/init/documents.conf

echo ""
echo "### Removing packages mongodb r-base-core nodejs-legacy npm git ..."
echo ""

apt-get -y remove mongodb r-base-core libopenblas-base nodejs-legacy npm git iptables-persistent

echo ""
echo "### Removing documents folder ..."
echo ""

rm -Rf /opt/documents 
rm -f  /opt/documents.log

echo ""
echo "### Remove dependencies?"
echo ""

select yn in "Yes" "No"; do
    case $yn in
        Yes ) break;;
        No )  echo "### Uninstall complete."; exit;;
    esac
done

echo ""
echo "### Removing all dependencies ..."
echo ""

apt-get -y autoremove

echo ""
echo "### Uninstall complete."
echo ""
