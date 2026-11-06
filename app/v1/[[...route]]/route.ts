import { handle } from 'hono/vercel';
import { getApp } from '@/lib/server';

/**
 * The WriteGrid API (lib/server, a Hono app) answering inside Next.js. The paths are the
 * full URL paths (/api/... and /v1/...), so the editor package calls the same URLs as before.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const handler = handle(getApp());
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
