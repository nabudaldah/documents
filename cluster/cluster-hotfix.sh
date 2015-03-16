#!/bin/bash

for i in 0 1 2 3; do
	echo "c$i: hotfixing ..."
	ssh "c$i" "cd /opt/documents && sudo bash hotfix.sh"
done

sleep 10s

for i in 0 1 2 3; do
	echo "c$i: status ..."
	ssh "c$i" curl -s "http://c$i:3000/v1/status"
done
