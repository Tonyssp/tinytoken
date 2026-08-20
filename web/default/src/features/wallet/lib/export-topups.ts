/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { getAllBillingHistory, isApiSuccess } from '../api'
import type { TopupRecord } from '../types'

const EXPORT_PAGE_SIZE = 100

function escapeCsvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function formatCsvTime(value?: number) {
  if (!value) return ''
  const milliseconds = value > 1_000_000_000_000 ? value : value * 1000
  return new Date(milliseconds).toISOString().replace('T', ' ').replace('Z', '')
}

function buildTopupCsv(records: TopupRecord[]) {
  const latestTime = records.reduce((latest, record) => {
    return Math.max(latest, record.complete_time || 0, record.create_time || 0)
  }, 0)
  const statuses = Array.from(
    new Set(['pending', 'success', 'expired', ...records.map((r) => r.status)])
  )

  const summaryRows = statuses.map((status) => {
    const matched = records.filter((record) => record.status === status)
    const amountTotal = matched.reduce((sum, record) => sum + record.amount, 0)
    const moneyTotal = matched.reduce((sum, record) => sum + record.money, 0)

    return [status, matched.length, amountTotal, moneyTotal]
  })

  const rows = [
    ['Summary until latest date', formatCsvTime(latestTime)],
    ['Total records', records.length],
    [],
    ['Status', 'Count', 'Amount total', 'Money total'],
    ...summaryRows,
    [],
    [
      'ID',
      'User ID',
      'Trade No',
      'Payment Method',
      'Status',
      'Amount',
      'Money',
      'Created At',
      'Completed At',
    ],
    ...records.map((record) => [
      record.id,
      record.user_id,
      record.trade_no,
      record.payment_method,
      record.status,
      record.amount,
      record.money,
      formatCsvTime(record.create_time),
      formatCsvTime(record.complete_time),
    ]),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

function downloadCsv(csv: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `tinyapi-topups-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadAdminTopupsCsv(keyword?: string) {
  const records: TopupRecord[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await getAllBillingHistory(page, EXPORT_PAGE_SIZE, keyword)

    if (!isApiSuccess(response) || !response.data) {
      throw new Error(response.message || 'Failed to export top-up records')
    }

    const items = response.data.items || []
    const total = response.data.total || items.length
    records.push(...items)
    hasMore = items.length > 0 && records.length < total
    page += 1
  }

  downloadCsv(buildTopupCsv(records))
  return records.length
}
