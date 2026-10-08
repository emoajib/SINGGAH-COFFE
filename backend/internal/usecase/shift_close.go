package usecase

import (
	domainErrors "singgah-pos-backend/internal/domain/errors"
)

// Close menutup shift aktif: hitung revenue/HPP/biaya/laba/dasar/owner/pool.
// Mengembalikan daftar warning bila data belum lengkap (tidak memblokir,
// kecuali status tidak memungkinkan tutup). Status -> ditutup.
func (uc *ShiftInstanceUsecase) Close(id, outletID uint, basisType string, ownerPct float64, userID uint, userName string) ([]string, error) {
	s, err := uc.repo.FindByID(id, outletID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("shift")
	}
	if s.Status != "aktif" {
		return nil, domainErrors.NewInvalidInputError("hanya shift aktif yang bisa ditutup")
	}
	if basisType == "" {
		basisType = "net"
	}
	if ownerPct <= 0 {
		ownerPct = 60
	}
	cfg, err := uc.configs.FindByID(s.ShiftConfigID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("konfigurasi shift")
	}
	tgl := s.Tanggal.Format("2006-01-02")
	rev, _ := uc.period.GetShiftRevenue(tgl, tgl, cfg.StartTime, cfg.EndTime, outletID)
	prods, _ := uc.period.GetShiftProductSales(tgl, tgl, cfg.StartTime, cfg.EndTime, outletID)
	var cogs float64
	for _, p := range prods {
		cogs += p.TotalCogs
	}
	langsung, _ := uc.expenses.SumByShiftInstance(s.ID, outletID)
	labaKotor := rev - cogs
	dasar := labaKotor
	if basisType == "net" {
		dasar = labaKotor - langsung
		if dasar < 0 {
			dasar = labaKotor
		}
	}
	if dasar < 0 {
		dasar = 0
	}
	s.Revenue = rev
	s.HPP = cogs
	s.BiayaLangsung = langsung
	s.DasarBagiHasil = dasar
	s.OwnerShare = roundIDR(dasar * ownerPct / 100)
	s.PoolBarista = dasar - s.OwnerShare
	s.Status = "ditutup"
	warnings := uc.closeWarnings(outletID, s)
	if err := uc.repo.Update(s); err != nil {
		return nil, err
	}
	_ = uc.audit.Write(outletID, userID, userName, "close", "shift_instance", id, "aktif", s, "", "disetujui")
	return warnings, nil
}
