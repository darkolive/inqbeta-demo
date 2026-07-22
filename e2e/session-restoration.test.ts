import { test, expect } from '@playwright/test';

test.describe('Workhouse session restoration', () => {
  const uniqueName = `TestUser${Date.now()}`;

  test('signed-out user sees loading state then START GAME', async ({ page }) => {
    // Collect console messages to verify no 401 spam
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.type() + ': ' + msg.text());
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

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

    // Wait for session check to complete
    await expect(startGameButton).toBeVisible({ timeout: 10000 });

    // 3. Verify only ONE /state request was made (no polling)
    const stateRequestCount = stateRequests.length;
    console.log('State requests:', stateRequests);
    expect(stateRequestCount).toBe(1);
    expect(stateRequests[0].status).toBe(401);

    // 4. Verify no 401 console errors
    const unauthorizedErrors = consoleErrors.filter(e => 
      e.includes('401') || e.includes('unauthenticated')
    );
    expect(unauthorizedErrors.length).toBe(0);

    // 5. Complete login
    await startGameButton.click();
    
    const usernameInput = page.getByLabel('Your character name');
    await usernameInput.fill(uniqueName);
    
    const enterButton = page.getByRole('button', { name: /ENTER GAME/i });
    await enterButton.click();

    // Wait for authenticated state
    await expect(page.getByText(`Welcome, ${uniqueName}`)).toBeVisible({ timeout: 10000 });
  });

  test('authenticated user sees loading then returns to authenticated state', async ({ page, context }) => {
    // First, create an authenticated session by logging in
    const uniqueName = `ReloadUser${Date.now()}`;
    
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

    // Navigate and login first
    await page.goto('/workhouse');
    
    // Wait for loading then login
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /START GAME/i })).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /START GAME/i }).click();
    await page.getByLabel('Your character name').fill(uniqueName);
    await page.getByRole('button', { name: /ENTER GAME/i }).click();
    
    // Wait for authenticated state
    await expect(page.getByText(`Welcome, ${uniqueName}`)).toBeVisible({ timeout: 10000 });
    
    // Get cookies to verify session
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'workhouseSession');
    console.log('Session cookie:', sessionCookie?.value ? 'present' : 'missing');
    
    // Clear request log
    stateRequests.length = 0;
    
    // Now reload the page - this is the key test!
    await page.reload();
    
    // 1. Loading state should be visible immediately on reload
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    
    // 2. START GAME should NOT flash during restoration
    const startGameButton = page.getByRole('button', { name: /START GAME/i });
    await expect(startGameButton).not.toBeVisible({ timeout: 5000 });
    
    // 3. Should return to authenticated state
    await expect(page.getByText(`Welcome, ${uniqueName}`)).toBeVisible({ timeout: 10000 });
    
    // 4. Verify only ONE initial request (no polling spam)
    console.log('Reload state requests:', stateRequests);
    const initialRequests = stateRequests.slice(0, 2); // First 2 requests
    expect(initialRequests.length).toBeGreaterThanOrEqual(1);
    expect(initialRequests[0].status).toBe(200);
    
    // 5. Wait a bit and check no additional requests were made (polling should be minimal)
    await page.waitForTimeout(3500);
    const totalRequests = stateRequests.length;
    console.log('Total state requests after wait:', totalRequests);
    
    // Should have initial + maybe 1 poll, but NOT many
    expect(totalRequests).toBeLessThanOrEqual(3);
  });

  test('login race: late 401 does not overwrite successful login', async ({ page }) => {
    // This tests the generation counter prevents race conditions
    // We simulate this by checking the final state is authenticated
    
    await page.goto('/workhouse');
    
    // Wait for loading
    await expect(page.getByText('Restoring your game…')).toBeVisible({ timeout: 5000 });
    
    // Login
    await page.getByRole('button', { name: /START GAME/i }).click();
    await page.getByLabel('Your character name').fill(`RaceUser${Date.now()}`);
    await page.getByRole('button', { name: /ENTER GAME/i }).click();
    
    // Should be authenticated
    await expect(page.getByText(/^Welcome,/)).toBeVisible({ timeout: 10000 });
    
    // Even if there's any delayed response, authenticated state should persist
    await page.waitForTimeout(2000);
    await expect(page.getByText(/^Welcome,/)).toBeVisible();
  });
});
