package usecase

import "testing"

// B7: contoh persis dari spesifikasi §2C.
// Dasar shift Rp1.000.000 -> Owner Rp600.000, pool Rp400.000.
func TestSplitEqualShare_SpecExample(t *testing.T) {
	owner, perPerson, n, remainder := splitShift(1000000, 60, 2)
	if owner != 600000 || perPerson != 200000 || n != 2 || remainder != 0 {
		t.Errorf("2 hadir: got owner=%v/orang=%v/n=%v/sisa=%v", owner, perPerson, n, remainder)
	}

	owner, perPerson, n, remainder = splitShift(1000000, 60, 1)
	if owner != 600000 || perPerson != 400000 || n != 1 || remainder != 0 {
		t.Errorf("1 hadir: got owner=%v/orang=%v/n=%v/sisa=%v", owner, perPerson, n, remainder)
	}
}

// B7: pool tak habis dibagi -> rupiah penuh per orang, sisa ke kas.
// Pool 400.000 / 3 = 133.333,33 -> @133.333, sisa 1 ke kas.
func TestSplitEqualShare_RemainderToKas(t *testing.T) {
	owner, perPerson, n, remainder := splitShift(1000000, 60, 3)
	if owner != 600000 || perPerson != 133333 || n != 3 || remainder != 1 {
		t.Errorf("3 hadir: got owner=%v/orang=%v/n=%v/sisa=%v", owner, perPerson, n, remainder)
	}
	// Invariansi: owner + n*orang + sisa = dasar.
	if owner+float64(n)*perPerson+remainder != 1000000 {
		t.Errorf("invariansi rusak: %v", owner+float64(n)*perPerson+remainder)
	}
}

// B7: tak ada yang hadir -> pool penuh jadi sisa kas, bukan milik siapa pun.
func TestSplitEqualShare_NoPresent(t *testing.T) {
	owner, perPerson, n, remainder := splitShift(1000000, 60, 0)
	if owner != 600000 || perPerson != 0 || n != 0 || remainder != 400000 {
		t.Errorf("0 hadir: got owner=%v/orang=%v/n=%v/sisa=%v", owner, perPerson, n, remainder)
	}
}

// B7: rasio total wajib 100%.
func TestValidateRatio_Total100(t *testing.T) {
	if _, err := validateRatio(60); err != nil {
		t.Errorf("60 harus valid: %v", err)
	}
	if _, err := validateRatio(0); err != nil {
		t.Errorf("0 (default 60) harus valid: %v", err)
	}
	if _, err := validateRatio(101); err == nil {
		t.Errorf("101 harus ditolak")
	}
}

// splitShift adalah harness uji: owner = Round(dasar*ownerPct), pool dibagi rata.
func splitShift(dasar, ownerPct float64, hadir int) (owner, perOrang float64, n int, sisa float64) {
	owner = roundIDR(dasar * ownerPct / 100)
	pool := dasar - owner
	perOrang, sisa = splitEqualShare(pool, hadir)
	return owner, perOrang, hadir, sisa
}
