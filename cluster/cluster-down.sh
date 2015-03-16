#!/bin/bash

for i in 0 1 2 3; do
	echo "c$i: stopping app ..."
	ssh "c$i" sudo service documents stop
done

echo "c0: stopping router ..."
ssh "c0" sudo service mongo-router stop

echo "c0: stopping config ..."
ssh "c0" sudo service mongo-config stop

for i in 0 1 2 3; do
	echo "c$i: stopping shard ..."
	ssh "c$i" sudo service mongo-shard stop
done

