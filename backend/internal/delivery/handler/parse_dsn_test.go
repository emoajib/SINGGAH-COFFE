package handler

import "testing"

func TestParseDBDSNWithAtInPassword(t *testing.T) {
	dsn := "sosb4282_singgah_pos:b1nt@nG9@tcp(localhost:3306)/sosb4282_singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
	user, pass, host, port, dbname, err := parseDBDSN(dsn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user != "sosb4282_singgah_pos" || pass != "b1nt@nG9" || host != "localhost" || port != "3306" || dbname != "sosb4282_singgah_pos" {
		t.Fatalf("got user=%q pass=%q host=%q port=%q dbname=%q", user, pass, host, port, dbname)
	}
}

func TestParseDBDSNSimple(t *testing.T) {
	dsn := "root:password@tcp(localhost:3306)/singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"
	user, pass, host, port, dbname, err := parseDBDSN(dsn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user != "root" || pass != "password" || host != "localhost" || port != "3306" || dbname != "singgah_pos" {
		t.Fatalf("got user=%q pass=%q host=%q port=%q dbname=%q", user, pass, host, port, dbname)
	}
}
