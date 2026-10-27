import { test, expect } from '@playwright/test';
import { startStack } from '../fixtures/stack.mjs';
let stack;
test.beforeAll(async () => {
  stack = await startStack();
  await expect.poll(async () => { try { return (await fetch(stack.origin + '/login')).status; } catch { return 0; } }).toBe(200);
  const version = await stack.pool.query('SHOW server_version');
  expect(version.rows[0].server_version).toMatch(/^17\./);
});
test.afterAll(async () => { await stack?.stop(); });

async function login(page, account) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with your identity provider' }).click();
  await page.getByRole('button', { name: `Sign in as ${account}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}
async function capture(page, info, label) {
  await expect.poll(() => page.locator('html').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`${label}.png`), fullPage: true });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`real PostgreSQL browser flow at ${viewport.width}px`, async ({ browser }, info) => {
    const contexts = [], pages = [], pageErrors = [], consoleErrors = [], responses = [];
    async function newPage() {
      const context = await browser.newContext({ viewport, baseURL: stack.origin }); contexts.push(context);
      const page = await context.newPage(); pages.push(page);
      page.on('pageerror', e => pageErrors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('response', r => { const u = new URL(r.url()); if (u.origin === stack.origin && u.pathname.startsWith('/v1/')) responses.push({ path: u.pathname, method: r.request().method(), status: r.status() }); });
      return page;
    }
    try {
      const owner = await newPage();
      await owner.goto('/organizations'); await expect(owner).toHaveURL(/\/login$/);
      await capture(owner, info, 'login');
      if (viewport.width === 1440) expect((await stack.pool.query('SELECT count(*)::int AS count FROM \"User\"')).rows[0].count).toBe(0);
      await login(owner, 'owner');
      expect((await stack.pool.query('SELECT count(*)::int AS count FROM \"OAuthIdentity\"')).rows[0].count).toBeGreaterThan(0);
      await expect(owner.getByText('Alex Owner', { exact: true })).toBeVisible();
      await capture(owner, info, 'dashboard');
      await owner.getByRole('link', { name: 'Organizations', exact: true }).click();
      await expect(owner.getByLabel('Organization name')).toBeVisible();
      const name = `Browser QA ${viewport.width}`, slug = `browser-qa-${viewport.width}`;
      await owner.getByLabel('Organization name').fill(name);
      await owner.getByLabel('Unique URL name').fill(slug);
      await owner.getByRole('button', { name: 'Create organization', exact: true }).click();
      await expect(owner.getByRole('status')).toHaveText('Organization created. You are its owner.');
      await expect(owner.getByRole('heading', { name: `${name} members` })).toBeVisible();
      await expect(owner.getByText('owner@example.test', { exact: true })).toBeVisible();
      await owner.reload();
      await expect(owner.getByRole('heading', { name: `${name} members` })).toBeVisible();
      await owner.getByLabel('Organization name').fill(name);
      await owner.getByLabel('Unique URL name').fill(slug);
      const duplicate = owner.waitForResponse(r => r.url().endsWith('/v1/organizations') && r.request().method() === 'POST');
      await owner.getByRole('button', { name: 'Create organization', exact: true }).click();
      expect((await duplicate).status()).toBe(409);
      await expect(owner.getByRole('alert').filter({ hasText: 'already in use' })).toBeVisible();
      await capture(owner, info, 'duplicate-error');
      await owner.reload();
      await owner.getByLabel('Email address', { exact: true }).fill('member@example.test');
      const org = (await stack.pool.query('SELECT id FROM "Organization" WHERE slug=$1', [slug])).rows[0];
      // A genuine database row lock makes the pending UI observable; no browser responses are mocked.
      const lock = await stack.pool.connect();
      try {
        await lock.query('BEGIN'); await lock.query('SELECT id FROM "Organization" WHERE id=$1 FOR UPDATE', [org.id]);
        await owner.getByRole('button', { name: 'Create invitation', exact: true }).click();
        await expect(owner.getByRole('button', { name: 'Create invitation', exact: true })).toBeDisabled();
      } finally { await lock.query('ROLLBACK'); lock.release(); }
      await expect(owner.getByLabel('Invitation link — shown only now')).toBeVisible();
      const invitation = await owner.getByLabel('Invitation link — shown only now').inputValue();
      expect(new URL(invitation).hash).toMatch(/^#token=[a-f0-9]{64}$/);
      await owner.reload(); // Remove one-time token from screenshots.
      await expect(owner.getByRole('heading', { name: `${name} members` })).toBeVisible();
      await capture(owner, info, 'organization-invitation');

      const outsider = await newPage(); await login(outsider, 'outsider'); await outsider.goto(invitation);
      const denied = outsider.waitForResponse(r => r.url().endsWith('/v1/invitations/accept'));
      await outsider.getByRole('button', { name: 'Accept invitation', exact: true }).click();
      expect((await denied).status()).toBe(403);
      await expect(outsider.getByRole('alert').filter({ hasText: 'invited email' })).toBeVisible();

      const member = await newPage(); await login(member, 'member'); await member.goto(invitation);
      await member.getByRole('button', { name: 'Accept invitation', exact: true }).click();
      await expect(member).toHaveURL(/\/organizations$/);
      await expect(member.getByRole('heading', { name: `${name} members` })).toBeVisible();
      await expect(member.getByText('Jordan Member', { exact: true }).last()).toBeVisible();
      await expect(member.getByRole('button', { name: 'Create invitation', exact: true })).toHaveCount(0);
      await capture(member, info, 'member-permissions');
      await member.goto(invitation);
      const replay = member.waitForResponse(r => r.url().endsWith('/v1/invitations/accept'));
      await member.getByRole('button', { name: 'Accept invitation', exact: true }).click();
      expect((await replay).status()).toBe(409);
      await expect(member.getByRole('alert').filter({ hasText: 'already used' })).toBeVisible();

      await owner.reload();
      await expect(owner.getByText('member@example.test', { exact: true }).first()).toBeVisible();
      await owner.getByLabel('Role for member@example.test').selectOption('ADMIN');
      await expect(owner.getByRole('status')).toHaveText('Role updated.');
      await owner.getByLabel('Role for member@example.test').selectOption('MEMBER');
      await expect(owner.getByRole('status')).toHaveText('Role updated.');
      await capture(owner, info, 'members');
      const data = await stack.pool.query('SELECT m.role FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND u.email=$2', [org.id, 'member@example.test']);
      expect(data.rows[0].role).toBe('MEMBER');

      await stack.pool.query(`UPDATE session SET expire='2000-01-01' WHERE sess->>'userId'=(SELECT id FROM "User" WHERE email=$1)`, ['member@example.test']);
      await member.goto('/organizations'); await expect(member).toHaveURL(/\/login$/);
      await owner.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(owner).toHaveURL(/\/login$/);
      await owner.goto('/dashboard'); await expect(owner).toHaveURL(/\/login$/);
      expect(pageErrors).toEqual([]);
      // Intentional denied/duplicate/replay requests have explicit assertions above.
      expect(consoleErrors.filter(x => !/Failed to load resource: the server responded with a status of (403|409)/.test(x))).toEqual([]);
      expect(responses.filter(r => r.status >= 500)).toEqual([]);
      expect(responses.some(r => r.path === '/v1/auth/callback' && r.status === 302)).toBe(true);
      await info.attach('sanitized-network-evidence', { body: JSON.stringify({ viewport, pageErrors, consoleErrors, responses }, null, 2), contentType: 'application/json' });
    } finally { for (const context of contexts) await context.close(); }
  });
}
