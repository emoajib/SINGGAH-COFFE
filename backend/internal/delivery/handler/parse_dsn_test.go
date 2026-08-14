package handler

import "testing"

func TestParseDBDSNWithAtInPassword(t *testing.T) {
	dsn := "app_user:p@ssw@rd@tcp(dbhost:3407)/app_db?charset=utf8mb4&parseTime=True&loc=Local"
	user, pass, host, port, dbname, err := parseDBDSN(dsn)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user != "app_user" || pass != "p@ssw@rd" || host != "dbhost" || port != "3407" || dbname != "app_db" {
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
