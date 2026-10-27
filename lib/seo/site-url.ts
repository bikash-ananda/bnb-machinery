const productionOrigin = "https://machinery-tools.com";
const configuredOrigin = process.env.APP_ORIGIN?.trim();
const vercelOrigin = process.env.VERCEL_URL?.trim();

export const siteOrigin = new URL(
  configuredOrigin || (vercelOrigin ? `https://${vercelOrigin}` : productionOrigin),
).origin;

export function absoluteSiteUrl(path: string): string {
  return new URL(path, `${siteOrigin}/`).toString();
}
