import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

// Default: isolated, disposable embedded PostgreSQL. CI uses a migrated PostgreSQL service.
const external = process.env.DATABASE_TEST_MODE === 'postgres';
const db = external ? new pg.Client({connectionString: process.env.DATABASE_URL}) : new PGlite();
if (external) await db.connect();
else await db.exec(await readFile(new URL('../packages/database/prisma/migrations/20261024000000_init/migration.sql', import.meta.url), 'utf8'));
const query = (sql) => db.query(sql);
const batch = (sql) => external ? db.query(sql) : db.exec(sql);
await query('BEGIN');
try {
  await batch(`INSERT INTO "User" (id,email,"displayName","updatedAt") VALUES ('test-u','test@example.invalid','Test',now());
    INSERT INTO "Organization" (id,name,slug,"updatedAt") VALUES ('test-a','A','test-a',now()),('test-b','B','test-b',now());
    INSERT INTO "Membership" (id,"userId","organizationId",role) VALUES ('test-m','test-u','test-a','OWNER');
    INSERT INTO "Project" (id,"organizationId","createdById",key,name,"updatedAt") VALUES ('test-p','test-a','test-u','APP','App',now());`);
  async function rejected(sql, code) {
    await query('SAVEPOINT negative_case');
    try { await assert.rejects(query(sql), e => e.code === code); }
    finally { await query('ROLLBACK TO SAVEPOINT negative_case'); }
  }
  await test('migration creates all seven domain tables', async () => {
    const r = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('User','Organization','Membership','Project','Task','Comment','AuditEvent')`);
    assert.equal(r.rows.length,7);
  });
  await test('duplicate email rejected', () => rejected(`INSERT INTO "User" (id,email,"displayName","updatedAt") VALUES ('test-u2','test@example.invalid','Test',now())`,'23505'));
  await test('duplicate organization membership rejected', () => rejected(`INSERT INTO "Membership" (id,"userId","organizationId") VALUES ('test-m2','test-u','test-a')`,'23505'));
  await test('orphan membership rejected', () => rejected(`INSERT INTO "Membership" (id,"userId","organizationId") VALUES ('test-m3','missing','test-a')`,'23503'));
  await test('project key unique within organization', () => rejected(`INSERT INTO "Project" (id,"organizationId","createdById",key,name,"updatedAt") VALUES ('test-p2','test-a','test-u','APP','App',now())`,'23505'));
  await test('project key reusable across organizations', async () => {
    await query(`INSERT INTO "Project" (id,"organizationId","createdById",key,name,"updatedAt") VALUES ('test-p2','test-b','test-u','APP','App',now())`);
  });
  await test('invalid membership role rejected', () => rejected(`INSERT INTO "Membership" (id,"userId","organizationId",role) VALUES ('test-m4','test-u','test-b','SUPERUSER')`,'22P02'));
  await test('project deletion cascades through task and comment', async () => {
    await batch(`INSERT INTO "Task" (id,"projectId","reporterId",title,"updatedAt") VALUES ('test-t','test-p','test-u','Task',now());
      INSERT INTO "Comment" (id,"taskId","authorId",body,"updatedAt") VALUES ('test-c','test-t','test-u','Comment',now());
      DELETE FROM "Project" WHERE id='test-p';`);
    assert.equal((await query(`SELECT id FROM "Task" WHERE id='test-t'`)).rows.length,0);
    assert.equal((await query(`SELECT id FROM "Comment" WHERE id='test-c'`)).rows.length,0);
  });
} finally {
  await query('ROLLBACK');
  if (external) await db.end(); else await db.close();
}
