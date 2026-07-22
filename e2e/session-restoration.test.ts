import { test, expect } from '@playwright/test';

test.describe('Workhouse session restoration', () => {
  test('signed-out user sees loading state then START GAME', async ({ page }) => {
    // Collect network requests
    const stateRequests: { url: string; status: number | null }[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/workhouse/state')) {
        stateRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Navigate to /workhouse - should show loading state first
    await page.goto('/workhouse');

    // 1. Initial loading state should be visible immediately
    const loadingText = page.getByText('Restoring your game…');
    await expect(loadingText).toBeVisible({ timeout: 5000 });
    
    // 2. START GAME should NOT be visible during loading
    const startGameButton = page.getByRole('button', { name: /START GAME/i });
    await expect(startGameButton).not.toBeVisible({ timeout: 5000 });

    // Wait for session check to complete - should show START GAME after 401
    await expect(startGameButton).toBeVisible({ timeout: 15000 });

    // 3. Verify only ONE /state request was made (no polling)
    console.log('State requests:', stateRequests);
    expect(stateRequests.length).toBe(1);
    expect(stateRequests[0].status).toBe(401);
  });

  test('authenticated user: login, then reload returns to authenticated state', async ({ page, context }) => {
    const uniqueName = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log('Test participant:', uniqueName);
    
    // Collect requests
    const stateRequests: { url: string; status: number | null }[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/workhouse/state')) {
        stateRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Navigate to /workhouse
    await page.goto('/workhouse');
    
    // Wait for loading then START GAME
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /START GAME/i })).toBeVisible({ timeout: 15000 });
    
    // Click START GAME to see login form
    await page.getByRole('button', { name: /START GAME/i }).click();
    
    // Fill in the form
    const usernameInput = page.getByLabel('Your character name');
    await expect(usernameInput).toBeVisible({ timeout: 5000 });
    await usernameInput.fill(uniqueName);
    
    // Submit
    const enterButton = page.getByRole('button', { name: /ENTER GAME/i });
    await enterButton.click();
    
    // Wait for authenticated state - look for Welcome with the username
    // The Welcome message format is "Welcome {username}" (no comma)
    await expect(page.getByText(`Welcome ${uniqueName}`)).toBeVisible({ timeout: 15000 });
    
    // Verify cookie was set
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'workhouseSession');
    console.log('Session cookie present:', !!sessionCookie);
    expect(sessionCookie).toBeDefined();
    
    // Clear request log for reload test
    const requestsBeforeReload = stateRequests.length;
    console.log('Requests before reload:', requestsBeforeReload);
    
    // Now reload the page - this is the key test!
    await page.reload();
    
    // 1. Loading state should be visible immediately on reload
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    
    // 2. START GAME should NOT flash during restoration
    const startGameButton = page.getByRole('button', { name: /START GAME/i });
    await expect(startGameButton).not.toBeVisible({ timeout: 5000 });
    
    // 3. Should return to authenticated state with same username
    await expect(page.getByText(`Welcome ${uniqueName}`)).toBeVisible({ timeout: 15000 });
    
    // 4. Get only the requests AFTER reload (to test authenticated reload)
    const reloadRequests = stateRequests.slice(requestsBeforeReload);
    console.log('Requests after reload:', reloadRequests.map(r => r.status));
    
    // At least one should be 200 (the restoration with session cookie)
    const successRequests = reloadRequests.filter(r => r.status === 200);
    expect(successRequests.length).toBeGreaterThanOrEqual(1);
    
    // 5. No 401 errors during authenticated reload (only check post-reload requests)
    const authErrors = reloadRequests.filter(r => r.status === 401);
    expect(authErrors.length).toBe(0);
  });
});
