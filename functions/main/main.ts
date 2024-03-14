import { JetTower } from "https://cdn.jsdelivr.net/gh/Byzanteam/jet-tower-plugin-js@2ba09f04586edff3a3e209242bc22ecd90aa39e7/mod.ts";
import { Hono } from "https://esm.sh/hono@4.0.10";
import { OAuth2Client } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";
import { joinPath } from "https://cdn.jsdelivr.net/gh/Byzanteam/breeze-js@latest/lib/url.ts";

const tower = new JetTower({ instanceName: "tower" });

const authorizeUrl = await tower.authorizeUrl();
const tokenUrl = await tower.tokenUrl();
const { clientId, clientSecret } = await tower.oauthClient();

console.log(`Authorize URL: ${authorizeUrl.toString()}`);
console.log(`Token URL: ${tokenUrl.toString()}`);
console.log(`Client ID: ${clientId}`);
console.log(`Client Secret: ${clientSecret}`);

const oauth2Client = new OAuth2Client({
  clientId,
  clientSecret,
  authorizationEndpointUri: authorizeUrl.toString(),
  tokenUri: tokenUrl.toString(),
  redirectUri: "http://localhost:2137/tower_oauth_example/development/main/oauth2/callback",
});

const app = new Hono();

app.get("/", (c) => {
  console.log(`Request reached.`);
  return c.text("Hello Deno!");
});

app.get("/login", async (ctx) => {
  const { uri } = await oauth2Client.code.getAuthorizationUri({
    disablePkce: true,
  });

  console.log(`Redirecting to: ${uri.toString()}`);

  return ctx.redirect(uri.toString());
});

app.get("/oauth2/callback", async (ctx) => {
  const url = new URL(ctx.req.url);
  url.pathname = joinPath(
    BreezeRuntime.env.get("JET_BREEZE_PATH_PREFIX")!,
    "/oauth2/callback",
  );

  console.log(`Getting token...`);

  const tokens = await oauth2Client.code.getToken(url.toString());

  console.log(`Get token: ${JSON.stringify(tokens)}`);

  console.log(`Getting user info...`);

  const { sub, name, phoneNumber, updatedAt, ...extraInfo } = await tower
    .getUserInfo(
      tokens.accessToken,
    );

  const u = new Date(updatedAt * 1000);

  return ctx.text(`
  ID: ${sub}
  name: ${name}
  phone: ${phoneNumber}
  updated at: ${u.toLocaleString()}
  extra: ${JSON.stringify(extraInfo)}
  `);
});

BreezeRuntime.serveHttp(app.fetch);
