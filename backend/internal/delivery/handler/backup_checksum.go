package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// G1: restore database harus punya pengaman sebelum menimpa data produksi.
//
// Alur: verifikasi checksum (bila manifest tersedia) → uji integritas gzip →
// snapshot database saat ini → restore → verifikasi skema. Jika restore gagal
// atau skema hasil restore tidak valid, snapshot pengaman dipulihkan kembali
// (satu percobaan, tanpa retry loop).

// checksumManifestPath mengembalikan path manifest checksum untuk sebuah arsip.
func checksumManifestPath(archivePath string) string {
	return archivePath + ".sha256"
}

// sha256File menghitung checksum SHA-256 isi file.
func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// writeChecksumManifest menulis manifest `<sha256>  <basename>` di samping arsip.
// Manifest bersifat opsional: backup lama tanpa manifest tetap bisa direstore.
func writeChecksumManifest(archivePath string) error {
	sum, err := sha256File(archivePath)
	if err != nil {
		return err
	}
	line := fmt.Sprintf("%s  %s\n", sum, filepath.Base(archivePath))
	return os.WriteFile(checksumManifestPath(archivePath), []byte(line), 0o644)
}

// verifyChecksumManifest memverifikasi arsip terhadap manifest bila ada.
// Mengembalikan error bila manifest ada tetapi isinya tidak cocok/rusak.
func verifyChecksumManifest(archivePath string) error {
	manifest := checksumManifestPath(archivePath)
	raw, err := os.ReadFile(manifest)
	if err != nil {
		if os.IsNotExist(err) {
			// Kompatibilitas backup lama.
			return nil
		}
		return err
	}

	fields := strings.Fields(string(raw))
	if len(fields) == 0 {
		return fmt.Errorf("manifest checksum rusak: %s", filepath.Base(manifest))
	}
	expected := strings.ToLower(fields[0])

	actual, err := sha256File(archivePath)
	if err != nil {
		return err
	}
	if actual != expected {
		return fmt.Errorf("checksum arsip tidak cocok (diharapkan %s, didapat %s)", expected, actual)
	}
	return nil
}

// validateGzipIntegrity menguji apakah arsip .gz dapat dibaca sampai habis
// sebelum statement apa pun dieksekusi ke database.
func validateGzipIntegrity(archivePath string) error {
	cmd := exec.Command("gunzip", "-t", archivePath)
	if out, err := cmd.CombinedOutput(); err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("arsip gzip rusak: %s", msg)
	}
	return nil
}

// dumpDatabase membuat dump SQL terkompresi dari database yang sedang aktif.
func dumpDatabase(dumpPath, user, pass, host, port, dbname string) error {
	dumpCmd := fmt.Sprintf(
		"set -o pipefail; mysqldump -u%s -h%s -P%s --single-transaction --quick --lock-tables=false %s | gzip > %s",
		user, host, port, dbname, dumpPath)
	cmd := exec.Command("bash", "-c", dumpCmd)
	cmd.Env = append(os.Environ(), "MYSQL_PWD="+pass)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%v: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// restoreDatabaseDump mengeksekusi dump .sql.gz ke database (tanpa shell pipe).
func restoreDatabaseDump(archivePath, user, pass, host, port, dbname string) error {
	gz := exec.Command("gunzip", "-c", archivePath)
	mysqlArgs := []string{fmt.Sprintf("-u%s", user), fmt.Sprintf("-h%s", host), fmt.Sprintf("-P%s", port), dbname}
	my := exec.Command("mysql", mysqlArgs...)
	my.Env = append(os.Environ(), "MYSQL_PWD="+pass)

	pipe, err := gz.StdoutPipe()
	if err != nil {
		return err
	}
	my.Stdin = pipe
	var outBuf strings.Builder
	my.Stdout = &outBuf
	my.Stderr = &outBuf

	if err := my.Start(); err != nil {
		return err
	}
	if err := gz.Run(); err != nil {
		_ = my.Wait()
		return fmt.Errorf("%v: %s", err, strings.TrimSpace(outBuf.String()))
	}
	if err := my.Wait(); err != nil {
		return fmt.Errorf("%v: %s", err, strings.TrimSpace(outBuf.String()))
	}
	return nil
}
