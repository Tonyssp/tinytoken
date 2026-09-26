package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestDeletedUsersOnlyAppearInDeletedSearch(t *testing.T) {
	truncateTables(t)
	active := User{Username: "active-test", Password: "password", AffCode: "active-aff"}
	deleted := User{Username: "deleted-test", Password: "password", AffCode: "deleted-aff"}
	require.NoError(t, DB.Create(&active).Error)
	require.NoError(t, DB.Create(&deleted).Error)
	require.NoError(t, DB.Delete(&deleted).Error)

	users, total, err := GetAllUsers(&common.PageInfo{Page: 1, PageSize: 20})
	require.NoError(t, err)
	require.Equal(t, int64(1), total)
	require.Len(t, users, 1)
	require.Equal(t, active.Id, users[0].Id)

	deletedStatus := -1
	results, total, err := SearchUsers("deleted-test", "", nil, &deletedStatus, 0, 20)
	require.NoError(t, err)
	require.Equal(t, int64(1), total)
	require.Len(t, results, 1)
	require.Equal(t, deleted.Id, results[0].Id)

	require.NoError(t, HardDeleteUserById(deleted.Id))
	results, total, err = SearchUsers("deleted-test", "", nil, &deletedStatus, 0, 20)
	require.NoError(t, err)
	require.Zero(t, total)
	require.Empty(t, results)
}
