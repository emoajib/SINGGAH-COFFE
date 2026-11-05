package usecase

import domainErrors "singgah-pos-backend/internal/domain/errors"

// assertOutletAccess memastikan data milik outlet yang sedang aktif.
//
// B4: operasi berbasis ID (update/delete) sebelumnya tidak memfilter outlet_id
// sehingga user outlet A bisa mengubah data outlet B hanya dengan menebak ID.
//
// Mengembalikan NotFound (bukan Forbidden) agar keberadaan data outlet lain
// tidak bocor ke pemanggil. outletID bersifat opsional: bila tidak dikirim
// (mis. job internal/test), pengecekan dilewati.
func assertOutletAccess(entityName string, dataOutletID uint, requested []uint) error {
	if len(requested) == 0 || requested[0] == 0 {
		return nil
	}
	if dataOutletID != 0 && dataOutletID != requested[0] {
		return domainErrors.NewNotFoundError(entityName)
	}
	return nil
}
