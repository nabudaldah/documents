#!/bin/bash

# Credits: http://www.linuxproblem.org/art_9.html

ssh-keygen -t rsa

ssh gen@c0 mkdir -p .ssh
ssh gen@c1 mkdir -p .ssh
ssh gen@c2 mkdir -p .ssh
ssh gen@c3 mkdir -p .ssh

cat .ssh/id_rsa.pub | ssh gen@c0 'cat >> .ssh/authorized_keys'
cat .ssh/id_rsa.pub | ssh gen@c1 'cat >> .ssh/authorized_keys'
cat .ssh/id_rsa.pub | ssh gen@c2 'cat >> .ssh/authorized_keys'
cat .ssh/id_rsa.pub | ssh gen@c3 'cat >> .ssh/authorized_keys'

