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

# Credits: http://stackoverflow.com/a/13242127
git fetch

for file in `git diff HEAD..origin/master --name-status | awk '/^A/ {print $2}'`
	do rm -f -- "$file"; done

for file in `git diff --name-status | awk '/^[CDMRTUX]/ {print $2}'`
	do git checkout -- "$file"; done

git pull

echo ""
echo "### Upgrading NPM packages."
echo ""

npm update

echo ""
echo "### Upgrading Bower packages."
echo ""

cd pub
#bower update -s --allow-root
bower update -s --allow-root --no-interactive | xargs echo
cd ..

echo ""
echo "### Restarting service."
echo ""

service documents restart

echo ""
echo "### All done."
echo ""

cd $CWD
