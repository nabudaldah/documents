#!/bin/bash

for i in 0 1 2 3; do
	echo "c$i: starting shard ..."
	ssh "c$i" sudo service mongo-shard start
done

sleep 10s

echo "c0: starting config server ..."
ssh "c0" sudo service mongo-config start
echo "c0: starting router server ..."
ssh "c0" sudo service mongo-router start

sleep 30s

for i in 0 1 2 3; do
	echo "c$i: starting app ..."
	ssh "c$i" sudo service documents start
done

sleep 10s

for i in 0 1 2 3; do
	echo "c$i: status ..."
	ssh "c$i" curl -s "http://c$i:3000/v1/status"
done
