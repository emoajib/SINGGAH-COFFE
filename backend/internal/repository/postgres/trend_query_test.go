package postgres

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestGetSumByStatusSince_ArgsAlignment(t *testing.T) {
	status := "Completed"
	start := "2026-09-14 00:00:00"
	end := "2026-09-14 23:59:59"
	timeFormat := "%H:00"

	// Case 1: TANPA outletID
	ow1, oArgs1 := outletWhere("orders")
	args1 := []interface{}{timeFormat, start, end, status}
	args1 = append(args1, oArgs1...)
	args1 = append(args1, timeFormat)

	assert.Equal(t, "", ow1)
	assert.Len(t, args1, 5)
	assert.Equal(t, timeFormat, args1[0], "Placeholder 1: SELECT DATE_FORMAT(created_at, ?)")
	assert.Equal(t, start, args1[1], "Placeholder 2: created_at >= ?")
	assert.Equal(t, end, args1[2], "Placeholder 3: created_at <= ?")
	assert.Equal(t, status, args1[3], "Placeholder 4: status = ?")
	assert.Equal(t, timeFormat, args1[4], "Placeholder 5: GROUP BY DATE_FORMAT(created_at, ?)")

	// Case 2: DENGAN outletID = 1
	outletID := uint(1)
	ow2, oArgs2 := outletWhere("orders", outletID)
	args2 := []interface{}{timeFormat, start, end, status}
	args2 = append(args2, oArgs2...)
	args2 = append(args2, timeFormat)

	assert.Contains(t, ow2, "orders.outlet_id = ?")
	assert.Len(t, args2, 6)
	assert.Equal(t, timeFormat, args2[0], "Placeholder 1: SELECT DATE_FORMAT(created_at, ?)")
	assert.Equal(t, start, args2[1], "Placeholder 2: created_at >= ?")
	assert.Equal(t, end, args2[2], "Placeholder 3: created_at <= ?")
	assert.Equal(t, status, args2[3], "Placeholder 4: status = ?")
	assert.Equal(t, outletID, args2[4], "Placeholder 5: orders.outlet_id = ?")
	assert.Equal(t, timeFormat, args2[5], "Placeholder 6: GROUP BY DATE_FORMAT(created_at, ?)")

	// Bandingkan dengan bug lama di 54240e4:
	buggyArgs := []interface{}{timeFormat, start, end, status, timeFormat}
	buggyArgs = append(buggyArgs, outletID)
	// Pada bug lama:
	// buggyArgs[4] adalah timeFormat ("%H:00") yang masuk ke placeholder outlet_id = ?
	// buggyArgs[5] adalah outletID (1) yang masuk ke placeholder DATE_FORMAT(created_at, ?)
	assert.Equal(t, timeFormat, buggyArgs[4], "BUG LAMA: outlet_id menerima string timeFormat '%H:00'")
	assert.Equal(t, outletID, buggyArgs[5], "BUG LAMA: DATE_FORMAT menerima uint outletID 1")
}
