#!/bin/bash

N=3

for ((i=0; i<=$N; i++)); do
        echo "c$i: $@"
        ssh gen@c$i "$@"
done

