#!/bin/bash

# Credits: http://www.linuxproblem.org/art_9.html

ssh-keygen -t rsa

N=7

for ((i=0; i<=$N; i++ )); do
	echo "c$i: Creating .ssh folder ..."
	ssh gen@c$i mkdir -p .ssh
done

for ((i=0; i<=$N; i++ )); do
	echo "c$i: Sending public key ..."
	cat ~/.ssh/id_rsa.pub | ssh gen@c$i 'cat >> .ssh/authorized_keys'
done
