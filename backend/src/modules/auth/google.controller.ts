import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../../shared/types/env.js";
import { authService } from "../../domain/auth/auth.service.js";
import { setSessionCookie } from "./auth.controller.js";
import { AppError } from "../../shared/errors/AppError.js";

type GoogleUserInfo = {
  sub?: string;
  id?: string;
  email?: string;
  email_verified?: boolean;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
};

function frontendOriginWithLocale(): string {
  const c = env();
  return `${c.FRONTEND_URL.replace(/\/$/, "")}/${c.FRONTEND_DEFAULT_LOCALE}`;
}

function terminalRedirect(): string {
  return `${frontendOriginWithLocale()}/terminal`;
}

function errorRedirect(code: string): string {
  return `${frontendOriginWithLocale()}/?error=${encodeURIComponent(code)}`;
}

function parseRefFromOAuthState(state: string | undefined): string | undefined {
  if (!state || typeof state !== "string") return undefined;
  const dot = state.indexOf(".");
  if (dot < 0) return undefined;
  try {
    const b64 = state.slice(dot + 1);
    const json = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8"),
    ) as { r?: string };
    const r = typeof json.r === "string" ? json.r.trim() : "";
    if (!r || r.length > 20) return undefined;
    return /^[A-Z0-9]{1,20}$/.test(r) ? r : undefined;
  } catch {
    return undefined;
  }
}

type GoogleOauthPlugin = {
  generateAuthorizationUri(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string>;
  getAccessTokenFromAuthorizationCodeFlow(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ token: { access_token: string } }>;
};

async function fetchGoogleUserProfile(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const res = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${res.status}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

function getGoogleOauth(app: FastifyInstance): GoogleOauthPlugin | undefined {
  return (app as FastifyInstance & { googleOAuth2?: GoogleOauthPlugin })
    .googleOAuth2;
}

export async function googleOAuthStart(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const c = env();
  if (!c.GOOGLE_CLIENT_ID || !c.GOOGLE_CLIENT_SECRET || !c.GOOGLE_CALLBACK_URL) {
    reply.redirect(errorRedirect("google_not_configured"));
    return;
  }

  const googleOAuth2 = getGoogleOauth(app);
  if (!googleOAuth2) {
    reply.redirect(errorRedirect("google_not_configured"));
    return;
  }

  try {
    const uri = await googleOAuth2.generateAuthorizationUri(request, reply);
    reply.redirect(uri);
  } catch {
    reply.redirect(errorRedirect("google_token_failed"));
  }
}

export async function googleOAuthCallback(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const q = request.query as {
    error?: string;
    state?: string;
  };

  if (q.error === "access_denied") {
    reply.redirect(errorRedirect("google_denied"));
    return;
  }

  const c = env();
  if (!c.GOOGLE_CLIENT_ID || !c.GOOGLE_CLIENT_SECRET || !c.GOOGLE_CALLBACK_URL) {
    reply.redirect(errorRedirect("google_not_configured"));
    return;
  }

  const googleOAuth2 = getGoogleOauth(app);
  if (!googleOAuth2) {
    reply.redirect(errorRedirect("google_not_configured"));
    return;
  }

  const refCode = parseRefFromOAuthState(q.state);

  try {
    const result = await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
      request,
      reply,
    );
    const token = result.token;

    const rawInfo = await fetchGoogleUserProfile(token.access_token);
    const googleId = rawInfo.sub ?? rawInfo.id;
    const email = rawInfo.email?.trim().toLowerCase();
    const emailVerified =
      rawInfo.email_verified === true || rawInfo.verified_email === true;

    if (!googleId) {
      reply.redirect(errorRedirect("google_bad_token"));
      return;
    }
    if (!email) {
      reply.redirect(errorRedirect("google_no_email"));
      return;
    }

    const oauthResult = await authService.completeGoogleOAuth({
      googleId,
      email,
      emailVerified,
      givenName: rawInfo.given_name ?? null,
      familyName: rawInfo.family_name ?? null,
      name: rawInfo.name ?? null,
      refCode,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    if (oauthResult.outcome === "2fa") {
      const url = new URL(`${frontendOriginWithLocale()}/`);
      url.searchParams.set("google2fa", "1");
      url.searchParams.set("tempToken", oauthResult.tempToken);
      reply.redirect(url.toString());
      return;
    }

    setSessionCookie(reply, oauthResult.rawToken);
    reply.redirect(terminalRedirect());
  } catch (err) {
    if (err instanceof AppError) {
      if (err.statusCode === 400) {
        reply.redirect(errorRedirect("google_email_unverified"));
        return;
      }
      if (err.statusCode === 409) {
        reply.redirect(errorRedirect("google_account_conflict"));
        return;
      }
    }
    request.log.warn({ err }, "googleOAuthCallback failed");
    reply.redirect(errorRedirect("google_token_failed"));
  }
}
