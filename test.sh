#!/bin/bash

P=http://localhost:3000/presence
D="-d dummy=fluff"
VALID_AUTH="Authorization: superNoggin500!"
INVALID_AUTH="Authorization: BAD"
MISSING_AUTH=

echo "GET /presence"
echo curl $P
curl "$P"
echo ; echo


echo "POST /presence MISSING AUTH"
echo curl $D $MISSING_AUTH $P
curl "$D" $MISSING_AUTH "$P"
echo ; echo

echo "POST /presence INVALID AUTH"
echo curl $D -H "$INVALID_AUTH" $P
curl "$D" -H "$INVALID_AUTH" "$P"
echo ; echo

echo "POST /presence VALID AUTH"
echo curl $D $VALID_AUTH $P
curl "$D" -L -H "$VALID_AUTH" "$P"
echo ; echo

echo "POST /presence INVALID AUTH"
echo curl $D -H "$INVALID_AUTH" $P
curl "$D" -H "$INVALID_AUTH" "$P"
echo ; echo

