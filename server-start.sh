#!/bin/bash
cd "$(dirname "$0")/backend"
export PORT=8080
export DATABASE_URL="sosb4282_singgah_pos:b1nt@nG9@tcp(localhost:3306)/sosb4282_singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
export JWT_SECRET="sg7$mK29#vPqL8*RnY4&xWzB3!cFjT1@hN6eAd5"
export NODE_ENV=production
exec ./singgah-backend