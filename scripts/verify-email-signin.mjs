#!/usr/bin/env node
/**
 * Email sign-in with a code, alongside Google.
 *
 * Google was the only way in, and most people who reached the sign-in page
 * from their result left it within seconds. The code (not a link) keeps the
 * whole sign-in in the tab that holds their calculator result.
 *
 * Run: npm run test:email-signin
 */
import { readFileSync } from 'node:fs';
import { isFirstSignIn, callbackMethod, isPlausibleEmail, normaliseCode } from '../lib/auth-user.ts';

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const at = (msAgo, now) => new Date(now - msAgo).toISOString();

// ── Who counts as new
{
  const now = Date.parse('2026-09-24T12:00:00Z');
  check('a code typed two minutes after the account was made still counts as a first sign-in',
    isFirstSignIn({ created_at: at(120_000, now), email_confirmed_at: at(2_000, now) }, now));
  check('a returning email user is not new',
    !isFirstSignIn({ created_at: at(9e8, now), email_confirmed_at: at(8e8, now) }, now));
  check('a new Google account is new, and a returning one is not',
    isFirstSignIn({ created_at: at(3_000, now), email_confirmed_at: at(3_000, now) }, now) &&
    !isFirstSignIn({ created_at: at(9e8, now), email_confirmed_at: at(9e8, now) }, now));
  check('without a confirmation time it falls back to when the account was made',
    isFirstSignIn({ created_at: at(5_000, now) }, now) && !isFirstSignIn({ created_at: at(120_000, now) }, now));
}

// ── Inputs
check('the sign-in method comes from the callback link, Google by default',
  callbackMethod('?code=x&via=email') === 'email' && callbackMethod('?code=x') === 'google' && callbackMethod('') === 'google');
check('an obvious typo is caught before sending',
  isPlausibleEmail(' person@example.com ') && !isPlausibleEmail('person@example') && !isPlausibleEmail('not an email'));
check('a pasted code keeps only its digits',
  normaliseCode('123 456') === '123456' && normaliseCode('12-34-56') === '123456' && normaliseCode('code: 987654') === '987654');

// ── Wiring
const login = readFileSync('app/login/page.tsx', 'utf8');
check('email sign-in stays off unless switched on',
  /const EMAIL_SIGNIN = process\.env\.NEXT_PUBLIC_EMAIL_SIGNIN === 'on'/.test(login) && /\{EMAIL_SIGNIN && \(/.test(login));
check('the code is checked in this tab, then finishes like any sign-in',
  /verifyOtp\(\{ email: email\.trim\(\), token, type: 'email' \}\)/.test(login) && /finishSignIn\(data\.session, 'email'\)/.test(login));
check('the sign-in listener leaves the redirect to finishSignIn while a code is checked',
  /SIGNED_IN' && session && !finishingWithCode\.current\) router\.push/.test(login) &&
  /finishingWithCode\.current = true[\s\S]{0,200}verifyOtp/.test(login));
check('a link in the email signs in through the callback, marked as email',
  /emailRedirectTo: `\$\{getOAuthRedirectTo\(\)\}\?via=email`/.test(login));
check('both ways in record which one was chosen',
  /authProvider: 'google'/.test(login) && /authProvider: 'email'/.test(login));
check('asking for another code does not count as another signup start',
  /if \(!isResend\) \{[\s\S]{0,80}trackSignupStarted/.test(login));
check('errors are announced', (login.match(/role="alert"/g) ?? []).length >= 2);
const callback = readFileSync('app/auth/callback/page.tsx', 'utf8');
check('Google and email links share one finish', /finishSignIn\(session, callbackMethod\(window\.location\.search\)\)/.test(callback) && !/authProvider: 'google'/.test(callback));
const stub = readFileSync('lib/supabase.ts', 'utf8');
check('without Supabase configured, sending or checking a code fails cleanly', /signInWithOtp: fail/.test(stub) && /verifyOtp: fail/.test(stub));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail && !c.ok ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nEmail sign-in verification failed: ${failed} check(s).` : '\nEmail sign-in verification passed');
process.exit(failed ? 1 : 0);
