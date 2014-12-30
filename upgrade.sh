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

git pull origin

echo ""
echo "### All done."
echo ""

cd $CWD

