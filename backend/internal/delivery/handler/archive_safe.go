package handler

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// G2: ekstraksi arsip uploads harus aman dari path traversal.
// Sebelumnya `tar xzf ... -C .` mengekstrak apa adanya sehingga arsip berisi
// "../../x" atau symlink bisa menulis di luar direktori uploads.

// isSafeArchivePath menolak path absolut, drive letter Windows, dan komponen "..".
func isSafeArchivePath(name string) bool {
	if name == "" || strings.ContainsRune(name, 0) {
		return false
	}
	// Normalisasi pemisah path (arsip bisa memakai '\').
	clean := strings.ReplaceAll(name, "\\", "/")
	if strings.HasPrefix(clean, "/") {
		return false
	}
	// "C:/..." atau "C:\..."
	if len(clean) >= 2 && clean[1] == ':' {
		return false
	}
	for _, part := range strings.Split(clean, "/") {
		if part == ".." {
			return false
		}
	}
	return true
}

// extractTarGzSafely mengekstrak arsip .tar.gz ke destDir (yang harus sudah ada).
// Hanya direktori dan file reguler yang diekstrak; symlink/hardlink/device
// dilewati. Setiap entri divalidasi dan hasil join dipastikan tetap di dalam destDir.
func extractTarGzSafely(archivePath, destDir string) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("arsip bukan gzip yang valid: %w", err)
	}
	defer gz.Close()

	root, err := filepath.Abs(destDir)
	if err != nil {
		return err
	}

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("arsip rusak: %w", err)
		}

		if !isSafeArchivePath(hdr.Name) {
			return fmt.Errorf("arsip berisi path tidak aman: %q", hdr.Name)
		}

		rel := filepath.FromSlash(strings.ReplaceAll(hdr.Name, "\\", "/"))
		target := filepath.Join(root, rel)

		// Defense in depth: pastikan hasil join tidak keluar dari staging.
		if target != root && !strings.HasPrefix(target, root+string(os.PathSeparator)) {
			return fmt.Errorf("arsip berisi path tidak aman: %q", hdr.Name)
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
		case tar.TypeReg, tar.TypeRegA:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
			if err != nil {
				return err
			}
			_, copyErr := io.Copy(out, tr)
			closeErr := out.Close()
			if copyErr != nil {
				return copyErr
			}
			if closeErr != nil {
				return closeErr
			}
		default:
			// Symlink/hardlink/char device: lewati demi keamanan.
			continue
		}
	}
	return nil
}

// restoreUploadsArchive mengekstrak arsip ke staging lalu menukarnya dengan
// direktori uploads secara hampir atomik (rename), sehingga kegagalan di tengah
// proses tidak meninggalkan uploads dalam kondisi parsial.
func restoreUploadsArchive(archivePath, uploadsDir string) error {
	base := filepath.Dir(uploadsDir)
	if base == "" {
		base = "."
	}
	staging, err := os.MkdirTemp(base, ".restore-")
	if err != nil {
		return err
	}
	// Staging dibersihkan apa pun hasilnya.
	defer os.RemoveAll(staging)

	if err := extractTarGzSafely(archivePath, staging); err != nil {
		return err
	}

	backupOld := uploadsDir + ".old"
	_ = os.RemoveAll(backupOld)

	hasOld := false
	if _, statErr := os.Stat(uploadsDir); statErr == nil {
		if err := os.Rename(uploadsDir, backupOld); err != nil {
			return fmt.Errorf("gagal menyiapkan direktori uploads: %w", err)
		}
		hasOld = true
	}

	if err := os.Rename(staging, uploadsDir); err != nil {
		// Rollback: kembalikan direktori lama.
		if hasOld {
			_ = os.Rename(backupOld, uploadsDir)
		}
		return fmt.Errorf("gagal menukar direktori uploads: %w", err)
	}

	if hasOld {
		_ = os.RemoveAll(backupOld)
	}
	return nil
}
