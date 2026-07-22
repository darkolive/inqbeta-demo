import { test, expect } from '@playwright/test';

test.describe('Workhouse session restoration', () => {
  test('signed-out user: exactly ONE /state request over 10 seconds', async ({ page }) => {
    test.setTimeout(20000);
    
    const stateRequests: { status: number }[] = [];
    page.on('response', r => {
      if (r.url().includes('/api/workhouse/state')) {
        stateRequests.push({ status: r.status() });
      }
    });

    await page.goto('/workhouse');

    // Loading visible immediately
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    
    // START GAME not visible during loading
    await expect(page.getByRole('button', { name: /START GAME/i })).not.toBeVisible({ timeout: 5000 });

    // After 401, START GAME appears
    await expect(page.getByRole('button', { name: /START GAME/i })).toBeVisible({ timeout: 15000 });

    console.log('Requests after START GAME:', stateRequests.length);
    expect(stateRequests.length).toBe(1);
    expect(stateRequests[0].status).toBe(401);
    
    // Wait and verify no additional requests
    await page.waitForTimeout(8000);
    
    console.log('Requests after 8s more:', stateRequests.length);
    expect(stateRequests.length).toBe(1);
  });

  test('authenticated: login works, polling occurs', async ({ page, context }) => {
    test.setTimeout(25000);
    
    const uniqueName = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stateRequests: { status: number }[] = [];
    page.on('response', r => {
      if (r.url().includes('/api/workhouse/state')) {
        stateRequests.push({ status: r.status() });
      }
    });

    await page.goto('/workhouse');
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /START GAME/i })).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('button', { name: /START GAME/i }).click();
    await page.getByLabel('Your character name').fill(uniqueName);
    await page.getByRole('button', { name: /ENTER GAME/i }).click();
    
    await expect(page.getByText(`Welcome ${uniqueName}`)).toBeVisible({ timeout: 15000 });
    
    // Wait for at least one polling cycle
    await page.waitForTimeout(6000);
    
    console.log('All requests:', stateRequests.map(r => r.status));
    console.log('Polling requests:', stateRequests.length);
    
    // After login + poll, should have more than just the initial requests
    expect(stateRequests.length).toBeGreaterThanOrEqual(2);
  });
});
