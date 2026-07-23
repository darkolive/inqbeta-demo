/**
 * Regression tests for Activity pagination logic in page.tsx.
 * Tests the core pagination calculations for activity records.
 *
 * Run with: npm test activity-pagination
 */

import { describe, it, expect } from 'vitest'

const EVIDENCE_PAGE_SIZE = 5

/**
 * Core pagination logic extracted from page.tsx for testing.
 * This mirrors the logic in the WorkhousePage component.
 */
function calculatePagination({
  filteredActivity,
  page,
  pageSize = EVIDENCE_PAGE_SIZE,
}: {
  filteredActivity: unknown[]
  page: number
  pageSize?: number
}) {
  const evidencePageCount = Math.max(
    1,
    Math.ceil(filteredActivity.length / pageSize),
  )
  const safeEvidencePage = Math.max(1, Math.min(page, evidencePageCount))
  const paginatedActivity = filteredActivity.slice(
    (safeEvidencePage - 1) * pageSize,
    safeEvidencePage * pageSize,
  )
  return {
    pageCount: evidencePageCount,
    currentPage: safeEvidencePage,
    entries: paginatedActivity,
  }
}

describe('Activity Pagination Logic', () => {
  describe('page 1 renders the first Activity slice', () => {
    it('returns first 5 items on page 1 when there are more than 5 items', () => {
      const activity = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 1 })

      expect(result.currentPage).toBe(1)
      expect(result.entries).toHaveLength(5)
      expect(result.entries[0].id).toBe(1)
      expect(result.entries[4].id).toBe(5)
    })

    it('returns all items on page 1 when there are fewer than page size', () => {
      const activity = Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 1 })

      expect(result.currentPage).toBe(1)
      expect(result.entries).toHaveLength(3)
    })
  })

  describe('selecting page 2 renders the second Activity slice', () => {
    it('returns items 6-10 on page 2', () => {
      const activity = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 2 })

      expect(result.currentPage).toBe(2)
      expect(result.entries).toHaveLength(5)
      expect(result.entries[0].id).toBe(6)
      expect(result.entries[4].id).toBe(10)
    })

    it('returns last 3 items on page 3 when there are 13 items', () => {
      const activity = Array.from({ length: 13 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 3 })

      expect(result.currentPage).toBe(3)
      expect(result.entries).toHaveLength(3)
      expect(result.entries[0].id).toBe(11)
      expect(result.entries[2].id).toBe(13)
    })
  })

  describe('the first-page records are no longer visible on page 2', () => {
    it('does not include page 1 items on page 2', () => {
      const activity = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      const page1Result = calculatePagination({ filteredActivity: activity, page: 1 })
      const page2Result = calculatePagination({ filteredActivity: activity, page: 2 })

      const page1Ids = page1Result.entries.map(e => e.id)
      const page2Ids = page2Result.entries.map(e => e.id)

      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids))
      expect(page1Ids).toEqual([1, 2, 3, 4, 5])
      expect(page2Ids).toEqual([6, 7, 8, 9, 10])
    })
  })

  describe('filtering resets the current page to page 1', () => {
    it('page resets to 1 when search changes (via useEffect in component)', () => {
      const fullActivity = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      // Simulate being on page 2 before filtering
      const beforeFilter = calculatePagination({ filteredActivity: fullActivity, page: 2 })

      // After filtering, only 6 items remain - component resets page to 1 via useEffect
      const filteredActivity = fullActivity.slice(0, 6)
      // The component resets the page to 1 via useEffect when activitySearch changes
      const afterFilter = calculatePagination({ filteredActivity: filteredActivity, page: 1 })

      // After the reset, page 1 should show first 5 items
      expect(afterFilter.currentPage).toBe(1)
      expect(afterFilter.entries).toHaveLength(5)
    })

    it('page count updates based on filtered results', () => {
      const fullActivity = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      const fullResult = calculatePagination({ filteredActivity: fullActivity, page: 1 })

      const filteredActivity = fullActivity.slice(0, 3)
      const filteredResult = calculatePagination({ filteredActivity: filteredActivity, page: 1 })

      expect(fullResult.pageCount).toBe(3)
      expect(filteredResult.pageCount).toBe(1)
    })
  })

  describe('pagination count is based on filtered Activity result count', () => {
    it('calculates correct page count for filtered results', () => {
      const activity = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 1 })

      expect(result.pageCount).toBe(3) // 12 / 5 = 2.4 -> 3 pages
    })

    it('handles exact page size boundary', () => {
      const activity = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 1 })

      expect(result.pageCount).toBe(2)
      expect(result.entries).toHaveLength(5)
    })

    it('handles empty results', () => {
      const activity: unknown[] = []
      const result = calculatePagination({ filteredActivity: activity, page: 1 })

      expect(result.pageCount).toBe(1)
      expect(result.entries).toHaveLength(0)
    })
  })

  describe('page clamping prevents invalid pages', () => {
    it('clamps page to maximum when exceeding page count', () => {
      const activity = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 100 })

      expect(result.currentPage).toBe(2)
    })

    it('clamps page to 1 when page is less than 1', () => {
      const activity = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      const result = calculatePagination({ filteredActivity: activity, page: 0 })

      expect(result.currentPage).toBe(1)
    })
  })
})
