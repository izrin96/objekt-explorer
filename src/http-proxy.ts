import { Client } from "pg";

const client = new Client({
  host: process.env.PROXY_HOST,
  user: process.env.PROXY_USER,
  database: process.env.PROXY_NAME,
  password: process.env.PROXY_PASS,
  port: Number(process.env.PROXY_PORT),
});

await client.connect();

const port = Number(process.env.PROXY_HTTP_PORT);

async function query(req: Request) {
  const key = req.headers.get("proxy-key");
  if (key !== process.env.PROXY_KEY) {
    return Response.json({ error: "Invalid key" }, { status: 401 });
  }

  const { sql, params, method } = await req.json();

  // prevent multiple queries
  const sqlBody = sql.replace(/;/g, "");

  try {
    if (method === "all") {
      const result = await client.query({
        text: sqlBody,
        values: params,
        rowMode: "array",
      });
      return Response.json(result.rows);
    }

    if (method === "execute") {
      const result = await client.query({
        text: sqlBody,
        values: params,
      });
      return Response.json(result.rows);
    }

    return Response.json({ error: "Unknown method value" }, { status: 500 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "error" }, { status: 500 });
  }
}

console.log(`Proxy listening on port ${process.env.PROXY_HTTP_PORT}`);

Bun.serve({
  port,
  routes: {
    "/query": {
      POST: query,
    },
  },
});
