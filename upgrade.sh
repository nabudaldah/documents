#!/bin/bash

echo ""
echo "### Documents App Upgrade v0.1 "
echo ""

if [[ "$USER" != "root" ]]; then
  echo ""
  echo "### Please run this script as root.";
  echo ""
  exit;
fi

CWD=$PWD

cd /opt/documents

echo ""
echo "### Pulling updates from Github repository."
echo ""

git pull origin

echo ""
echo "### Restarting service."
echo ""

service documents restart

echo ""
echo "### All done."
echo ""

cd $CWD
