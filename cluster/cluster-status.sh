#!/bin/bash

for i in 0 1 2 3; do
	echo "c$i: ping: "
	ping -c1 c$i
done

echo "c0: router status: "
mongo c0:27017/documents --eval "print(JSON.stringify(sh.status()))"

echo "c0: config status: "
mongo c0:27019/config --eval "print(JSON.stringify(db.stats()))"

for i in 0 1 2 3; do
	echo "c$i: shard status: "
	mongo c$i:27018/documents --eval "print(JSON.stringify(db.stats()))"
done

for i in 0 1 2 3; do
	echo "c$i: app status: "
	curl -s "http://c$i:3000/v1/status" 
done

