package handler

import (
	"archive/tar"
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIsSafeArchivePath(t *testing.T) {
	safe := []string{
		"uploads/logo.png",
		"logo.png",
		"a/b/c/d.jpg",
		"./uploads/logo.png",
		"folder..name/file.png",
	}
	for _, p := range safe {
		assert.True(t, isSafeArchivePath(p), "harus aman: %q", p)
	}

	unsafe := []string{
		"",
		"../evil.txt",
		"a/../../evil.txt",
		"../../etc/passwd",
		"/etc/passwd",
		`C:\windows\system32\evil.dll`,
		"a\\..\\evil.txt",
		"bad\x00name",
	}
	for _, p := range unsafe {
		assert.False(t, isSafeArchivePath(p), "harus ditolak: %q", p)
	}
}

type tarEntry struct {
	name     string
	body     string
	typeflag byte
	linkname string
}

func writeTarGz(t *testing.T, path string, entries []tarEntry) {
	t.Helper()
	f, err := os.Create(path)
	require.NoError(t, err)
	defer f.Close()

	gz := gzip.NewWriter(f)
	tw := tar.NewWriter(gz)

	for _, e := range entries {
		typeflag := e.typeflag
		if typeflag == 0 {
			typeflag = tar.TypeReg
		}
		hdr := &tar.Header{
			Name:     e.name,
			Mode:     0o644,
			Size:     int64(len(e.body)),
			Typeflag: typeflag,
			Linkname: e.linkname,
		}
		if typeflag != tar.TypeReg {
			hdr.Size = 0
		}
		require.NoError(t, tw.WriteHeader(hdr))
		if typeflag == tar.TypeReg {
			_, err := tw.Write([]byte(e.body))
			require.NoError(t, err)
		}
	}
	require.NoError(t, tw.Close())
	require.NoError(t, gz.Close())
}

// G2 regression: arsip normal diekstrak dengan struktur direktori yang benar.
func TestExtractTarGzSafely_Success(t *testing.T) {
	tmp := t.TempDir()
	archive := filepath.Join(tmp, "uploads.tar.gz")
	dest := filepath.Join(tmp, "out")
	require.NoError(t, os.MkdirAll(dest, 0o755))

	writeTarGz(t, archive, []tarEntry{
		{name: "logo/logo.png", body: "PNGDATA"},
		{name: "logo/2026/foto.jpg", body: "JPGDATA"},
	})

	require.NoError(t, extractTarGzSafely(archive, dest))

	got, err := os.ReadFile(filepath.Join(dest, "logo", "logo.png"))
	require.NoError(t, err)
	assert.Equal(t, "PNGDATA", string(got))

	got2, err := os.ReadFile(filepath.Join(dest, "logo", "2026", "foto.jpg"))
	require.NoError(t, err)
	assert.Equal(t, "JPGDATA", string(got2))
}

// G2 regression: entri ".." harus ditolak dan tidak boleh menulis di luar tujuan.
func TestExtractTarGzSafely_RejectsPathTraversal(t *testing.T) {
	tmp := t.TempDir()
	archive := filepath.Join(tmp, "evil.tar.gz")
	dest := filepath.Join(tmp, "out")
	require.NoError(t, os.MkdirAll(dest, 0o755))

	writeTarGz(t, archive, []tarEntry{
		{name: "../../escaped.txt", body: "PWNED"},
	})

	err := extractTarGzSafely(archive, dest)
	assert.Error(t, err)

	_, statErr := os.Stat(filepath.Join(tmp, "escaped.txt"))
	assert.True(t, os.IsNotExist(statErr), "file tidak boleh keluar dari direktori tujuan")
}

// G2 regression: symlink di dalam arsip dilewati (tidak dibuat).
func TestExtractTarGzSafely_SkipsSymlink(t *testing.T) {
	tmp := t.TempDir()
	archive := filepath.Join(tmp, "link.tar.gz")
	dest := filepath.Join(tmp, "out")
	require.NoError(t, os.MkdirAll(dest, 0o755))

	writeTarGz(t, archive, []tarEntry{
		{name: "link.txt", typeflag: tar.TypeSymlink, linkname: "/etc/passwd"},
		{name: "ok.txt", body: "OK"},
	})

	require.NoError(t, extractTarGzSafely(archive, dest))

	info, err := os.Lstat(filepath.Join(dest, "link.txt"))
	assert.True(t, os.IsNotExist(err), "symlink tidak boleh dibuat")
	assert.Nil(t, info)

	got, err := os.ReadFile(filepath.Join(dest, "ok.txt"))
	require.NoError(t, err)
	assert.Equal(t, "OK", string(got))
}

// G2 regression: restore uploads menukar direktori secara utuh (isi lama hilang,
// isi arsip menggantikan) sehingga tidak ada kondisi parsial.
func TestRestoreUploadsArchive_ReplacesDirectory(t *testing.T) {
	tmp := t.TempDir()
	uploads := filepath.Join(tmp, "uploads")
	require.NoError(t, os.MkdirAll(uploads, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(uploads, "lama.txt"), []byte("LAMA"), 0o644))

	archive := filepath.Join(tmp, "restore.tar.gz")
	writeTarGz(t, archive, []tarEntry{
		{name: "baru.txt", body: "BARU"},
	})

	require.NoError(t, restoreUploadsArchive(archive, uploads))

	got, err := os.ReadFile(filepath.Join(uploads, "baru.txt"))
	require.NoError(t, err)
	assert.Equal(t, "BARU", string(got))

	_, statErr := os.Stat(filepath.Join(uploads, "lama.txt"))
	assert.True(t, os.IsNotExist(statErr), "isi lama harus tergantikan")

	// Tidak boleh ada direktori staging tersisa.
	entries, err := os.ReadDir(tmp)
	require.NoError(t, err)
	for _, e := range entries {
		assert.NotContains(t, e.Name(), ".restore-", "staging harus dibersihkan")
	}
}
