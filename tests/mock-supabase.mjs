// Local-only HTTP test double. It does NOT replace verification against a real Supabase project.
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { seedMachines } from "../src/rental.ts";
export async function startMockSupabase() {
  const users = {
    owner: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.test",
    },
    viewer: {
      id: "22222222-2222-4222-8222-222222222222",
      email: "viewer@example.test",
    },
  };
  const tokens = new Map();
  for (const [role, user] of Object.entries(users)) {
    const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}`;
    tokens.set(
      role,
      `${body}.${createHmac("sha256", "test-only-secret").update(body).digest("base64url")}`,
    );
  }
  let rows = seedMachines.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    rate: m.rate,
    min_hours: m.minHours,
    image_key: m.imageKey,
    visible: m.visible,
    sort_order: m.sortOrder,
  }));
  const photos = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:54329"),
      path = decodeURIComponent(url.pathname);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    let json = {};
    try {
      json = JSON.parse(body.toString());
    } catch {}
    const role = [...tokens].find(
      ([, token]) => req.headers.authorization === `Bearer ${token}`,
    )?.[0];
    const reply = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const user = role
      ? {
          ...users[role],
          aud: "authenticated",
          role: "authenticated",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: new Date().toISOString(),
          identities: [],
        }
      : null;
    if (path === "/auth/v1/token") {
      const login = Object.entries(users).find(
        ([, u]) => u.email === json.email,
      )?.[0];
      if (!login || json.password !== "test-password")
        return reply(400, {
          code: "invalid_credentials",
          message: "Invalid credentials",
        });
      return reply(200, {
        access_token: tokens.get(login),
        refresh_token: `refresh-${login}`,
        token_type: "bearer",
        expires_in: 3600,
        user: {
          ...users[login],
          aud: "authenticated",
          role: "authenticated",
          app_metadata: { provider: "email" },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    }
    if (path === "/auth/v1/user")
      return reply(user ? 200 : 401, user || { message: "Invalid token" });
    if (path === "/auth/v1/logout") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (path === "/rest/v1/rpc/is_site_owner")
      return reply(200, role === "owner");
    if (path === "/rest/v1/machines") {
      if (req.method === "GET") {
        let found = role === "owner" ? rows : rows.filter((m) => m.visible);
        if (url.searchParams.get("visible") === "eq.true")
          found = found.filter((m) => m.visible);
        return reply(200, found);
      }
      if (role !== "owner") return reply(403, { message: "RLS denied" });
      if (req.method === "POST") {
        rows.push({ ...json, sort_order: 100 + rows.length });
        return reply(201, null);
      }
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const found = rows.filter((m) => m.id === id);
      if (req.method === "PATCH")
        rows = rows.map((m) => (m.id === id ? { ...m, ...json } : m));
      if (req.method === "DELETE") rows = rows.filter((m) => m.id !== id);
      return reply(
        200,
        found.map((m) => ({ id: m.id })),
      );
    }
    if (path === "/storage/v1/object/list/machine-photos")
      return reply(
        role === "owner" ? 200 : 403,
        role === "owner"
          ? [...photos.keys()]
              .filter((k) => k.includes(json.search || ""))
              .map((name) => ({ name }))
          : {},
      );
    const signed = path.match(
      /^\/storage\/v1\/object\/upload\/sign\/machine-photos\/([^/]+)$/,
    );
    if (signed) {
      const key = signed[1];
      if (req.method === "POST")
        return reply(role === "owner" ? 200 : 403, {
          url: `/object/upload/sign/machine-photos/${key}?token=test-upload-token`,
        });
      if (
        req.method === "PUT" &&
        url.searchParams.get("token") === "test-upload-token"
      ) {
        const request = new Request(url, {
          method: "POST",
          headers: { "content-type": req.headers["content-type"] },
          body,
        });
        const form = await request.formData();
        const file = [...form.values()].find((v) => typeof v !== "string");
        photos.set(key, Buffer.from(await file.arrayBuffer()));
        return reply(200, { Key: `machine-photos/${key}` });
      }
    }
    const photo = path.match(
      /^\/storage\/v1\/object\/public\/machine-photos\/([^/]+)$/,
    );
    if (photo && photos.has(photo[1])) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(photos.get(photo[1]));
      return;
    }
    return reply(404, {
      message: `Unhandled test endpoint ${req.method} ${path}`,
    });
  });
  await new Promise((resolve) => server.listen(54329, "127.0.0.1", resolve));
  return {
    close: () => new Promise((resolve) => server.close(resolve)),
    photos,
  };
}
