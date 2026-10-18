import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL RLS: только владелец управляет карточками и загрузкой фотографий", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    await db.exec(await readFile("supabase/schema.sql", "utf8"));
    await db.exec(`insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
      insert into public.site_owners(user_id) values ('11111111-1111-4111-8111-111111111111');`);
    await db.exec(`set role anon;`);
    assert.equal(
      (await db.query("select * from public.machines")).rows.length,
      4,
    );
    assert.equal(
      (await db.query("select public.is_site_owner() as owner")).rows[0].owner,
      false,
    );
    await assert.rejects(
      db.query("select * from public.site_owners"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("delete from public.machines"),
      /permission denied/,
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`,
    );
    assert.equal(
      (await db.query("select public.is_site_owner() as owner")).rows[0].owner,
      true,
    );
    await db.query("update public.machines set visible=false where id='mini'");
    assert.equal(
      (await db.query("select * from public.machines")).rows.length,
      4,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('machine-photos','owner.png')",
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values ('another-bucket','other.png')",
      ),
      /row-level security/,
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
    assert.equal(
      (await db.query("select * from public.machines")).rows.length,
      3,
    );
    assert.equal(
      (await db.query("select * from public.machines where id='mini'")).rows
        .length,
      0,
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`,
    );
    assert.equal(
      (await db.query("select public.is_site_owner() as owner")).rows[0].owner,
      false,
    );
    assert.equal(
      (
        await db.query(
          "update public.machines set rate=1 where id='excavator' returning id",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.machines returning id")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.machines(id,name,description,rate,min_hours) values ('bad','Test','Test',1,1)",
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values ('machine-photos','viewer.png')",
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.site_owners(user_id) values ('22222222-2222-4222-8222-222222222222')",
      ),
      /permission denied/,
    );
    await db.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`,
    );
    await db.query("delete from public.machines");
    assert.equal(
      (await db.query("select * from public.machines")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
