package model

// TopUpApproval is an append-only audit record written in the same transaction
// as the pending-to-success transition and quota update.
type TopUpApproval struct {
	ID                int    `gorm:"primaryKey"`
	TopUpID           int    `gorm:"uniqueIndex;not null"`
	TradeNo           string `gorm:"index;type:varchar(255)"`
	UserID            int
	PaymentAmount     float64
	Credits           int64
	ApprovedAt        int64
	Method            string `gorm:"type:varchar(16)"`
	TelegramAdminID   int64
	VerifiedReference *string `gorm:"uniqueIndex;type:varchar(128)"`
}
