package handler

import (
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeGzipFile(t *testing.T, path, body string) {
	t.Helper()
	f, err := os.Create(path)
	require.NoError(t, err)
	defer f.Close()
	gz := gzip.NewWriter(f)
	_, err = gz.Write([]byte(body))
	require.NoError(t, err)
	require.NoError(t, gz.Close())
}

// G1: manifest checksum harus mendeteksi arsip yang berubah.
func TestVerifyChecksumManifest_DetectsTampering(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "db_20260101_000000.sql.gz")
	writeGzipFile(t, archive, "CREATE TABLE users (id INT);\n")

	require.NoError(t, writeChecksumManifest(archive))
	require.NoError(t, verifyChecksumManifest(archive), "arsip utuh harus lolos verifikasi")

	// Ubah isi arsip (mis. upload ulang yang korup / disisipi).
	writeGzipFile(t, archive, "CREATE TABLE users (id INT); DROP TABLE users;\n")

	err := verifyChecksumManifest(archive)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "checksum")
}

// G1: backup lama tanpa manifest tetap bisa direstore (kompatibilitas).
func TestVerifyChecksumManifest_MissingManifestAllowed(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "db_legacy.sql.gz")
	writeGzipFile(t, archive, "SELECT 1;\n")

	assert.NoError(t, verifyChecksumManifest(archive))
}

// G1: gzip rusak harus ditolak sebelum statement apa pun dieksekusi.
func TestValidateGzipIntegrity(t *testing.T) {
	dir := t.TempDir()

	good := filepath.Join(dir, "good.sql.gz")
	writeGzipFile(t, good, "CREATE TABLE orders (id INT);\n")
	assert.NoError(t, validateGzipIntegrity(good))

	bad := filepath.Join(dir, "bad.sql.gz")
	require.NoError(t, os.WriteFile(bad, []byte("bukan gzip sama sekali"), 0o644))
	assert.Error(t, validateGzipIntegrity(bad))
}

// G1: manifest rusak/kosong tidak boleh dianggap valid.
func TestVerifyChecksumManifest_EmptyManifestRejected(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "db_empty.sql.gz")
	writeGzipFile(t, archive, "SELECT 1;\n")
	require.NoError(t, os.WriteFile(checksumManifestPath(archive), []byte("  \n"), 0o644))

	assert.Error(t, verifyChecksumManifest(archive))
}
