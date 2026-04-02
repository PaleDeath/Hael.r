const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';
const artifactDir = __dirname;
const email = `smoke.${Date.now()}@example.com`;
const password = 'SmokeTest123!';
const firstName = 'Smoke';
const lastName = 'Tester';

const results = {
  startedAt: new Date().toISOString(),
  baseUrl,
  credentials: {
    email,
    firstName,
    lastName
  },
  flows: {},
  summary: {
    working: [],
    broken: []
  }
};

let currentFlow = 'setup';

function ensureFlow(name) {
  if (!results.flows[name]) {
    results.flows[name] = {
      status: 'pending',
      checks: [],
      failures: [],
      notes: [],
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      requestStats: {
        auth: [],
        firestoreWrites: [],
        firestoreReads: [],
        api: [],
        other: []
      }
    };
  }
  return results.flows[name];
}

function startFlow(name) {
  currentFlow = name;
  const flow = ensureFlow(name);
  flow.status = 'running';
  return flow;
}

function addCheck(message) {
  ensureFlow(currentFlow).checks.push(message);
}

function addNote(message) {
  ensureFlow(currentFlow).notes.push(message);
}

function addFailure(message, rootCause = null) {
  const flow = ensureFlow(currentFlow);
  flow.failures.push({ message, rootCause });
  flow.status = 'failed';
}

function finalizeFlow(name) {
  const flow = ensureFlow(name);
  if (flow.status !== 'failed') {
    flow.status = 'passed';
    results.summary.working.push(name);
  } else {
    results.summary.broken.push(name);
  }
}

function classifyRequest(url, method) {
  if (url.includes('identitytoolkit.googleapis.com') || url.includes('securetoken.googleapis.com')) {
    return 'auth';
  }
  if (url.includes('google.firestore.v1.Firestore/Write') || url.includes('documents:commit')) {
    return 'firestoreWrites';
  }
  if (url.includes('google.firestore.v1.Firestore/Listen') || url.includes('documents:batchGet') || url.includes('firestore.googleapis.com')) {
    return method === 'POST' ? 'firestoreReads' : 'other';
  }
  if (url.includes('/api/') || url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
    return 'api';
  }
  return 'other';
}

function isInterestingRequest(url) {
  return [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firestore.googleapis.com',
    'google.firestore.v1.Firestore',
    '/api/',
    'localhost:5000',
    '127.0.0.1:5000'
  ].some((token) => url.includes(token));
}

async function saveArtifact(page, name) {
  const filePath = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function clickMenu(page) {
  const menuButton = page.getByRole('button', { name: /menu/i }).first();
  await menuButton.click();
}

async function waitForText(page, text, timeout = 15000) {
  await page.getByText(text, { exact: false }).waitFor({ timeout });
}

function getNewRequestDelta(flow, beforeCounts) {
  return {
    auth: flow.requestStats.auth.length - beforeCounts.auth,
    firestoreWrites: flow.requestStats.firestoreWrites.length - beforeCounts.firestoreWrites,
    firestoreReads: flow.requestStats.firestoreReads.length - beforeCounts.firestoreReads,
    api: flow.requestStats.api.length - beforeCounts.api
  };
}

function getCounts(flow) {
  return {
    auth: flow.requestStats.auth.length,
    firestoreWrites: flow.requestStats.firestoreWrites.length,
    firestoreReads: flow.requestStats.firestoreReads.length,
    api: flow.requestStats.api.length
  };
}

function hasMeaningfulFailures(flow) {
  return (
    flow.consoleErrors.length > 0 ||
    flow.pageErrors.length > 0 ||
    flow.failedRequests.some((request) => !request.failure.includes('ERR_ABORTED'))
  );
}

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      ensureFlow(currentFlow).consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    ensureFlow(currentFlow).pageErrors.push(err.message);
  });

  page.on('request', (request) => {
    const url = request.url();
    if (!isInterestingRequest(url)) return;
    const bucket = classifyRequest(url, request.method());
    ensureFlow(currentFlow).requestStats[bucket].push({
      method: request.method(),
      url
    });
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!isInterestingRequest(url)) return;
    ensureFlow(currentFlow).failedRequests.push({
      method: request.method(),
      url,
      failure: request.failure()?.errorText || 'unknown'
    });
  });

  try {
    let isAuthenticated = false;

    startFlow('authentication');
    const authFlow = ensureFlow('authentication');
    try {
      await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Welcome to Hael.r');
      const registerCounts = getCounts(authFlow);

      await page.getByRole('button', { name: /register/i }).click();
      await page.getByLabel('First Name').fill(firstName);
      await page.getByLabel('Last Name').fill(lastName);
      await page.getByLabel('Email Address').fill(email);
      await page.locator('#password').fill(password);
      await page.locator('#confirmPassword').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL(/\/$/, { timeout: 30000 });
      addCheck('Created a new account successfully.');

      const authDelta = getNewRequestDelta(authFlow, registerCounts);
      if (authDelta.auth > 0) {
        addCheck('Observed Firebase Authentication network activity during registration.');
      } else {
        addNote('No distinct Authentication request was captured during registration, but the UI completed and session state changed.');
      }

      await page.goto(`${baseUrl}/community`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Community');
      await clickMenu(page);
      const welcomeByName = page.getByText(`Welcome, ${firstName}`, { exact: false });
      const signOutButton = page.getByRole('button', { name: /sign out\./i });
      if (await welcomeByName.isVisible().catch(() => false)) {
        addCheck('Authenticated navbar state loaded with the expected profile name after redirect.');
      } else if (await signOutButton.isVisible().catch(() => false)) {
        addFailure(
          'Authentication succeeded, but the navbar did not load the expected user profile name.',
          'The auth session exists, but `userProfile` did not populate from Firestore after registration.'
        );
      } else {
        addFailure(
          'Authentication redirect completed, but the authenticated navbar state did not render.',
          'The session may not have propagated correctly to the routed page.'
        );
      }

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Community');
      await clickMenu(page);
      if (await signOutButton.isVisible().catch(() => false)) {
        addCheck('Auth session persisted across reload.');
      } else {
        addFailure('Auth session did not persist across reload.', 'Firebase auth persistence did not survive a full page refresh.');
      }

      await signOutButton.click();
      await waitForText(page, 'Community');
      await clickMenu(page);
      await waitForText(page, 'sign in.');
      addCheck('Logout succeeded.');

      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email Address').fill(email);
      await page.locator('#password').fill(password);
      const loginCounts = getCounts(authFlow);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/$/, { timeout: 30000 });
      const loginDelta = getNewRequestDelta(authFlow, loginCounts);
      if (loginDelta.auth > 0) {
        addCheck('Observed Firebase Authentication network activity during login.');
      }

      await page.goto(`${baseUrl}/community`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Community');
      await clickMenu(page);
      if (await signOutButton.isVisible().catch(() => false)) {
        addCheck('Login restored an authenticated session.');
        if (await welcomeByName.isVisible().catch(() => false)) {
          addCheck('Fresh login also restored the Firestore-backed user profile name.');
        } else {
          addFailure(
            'Login worked, but the Firestore-backed user profile name was still missing after a fresh sign-in.',
            'The `users/{uid}` document is missing, unreadable, or the profile fetch path is failing.'
          );
        }
        isAuthenticated = true;
      } else {
        addFailure('Login did not restore an authenticated navbar state.', 'The login redirect happened, but authenticated UI state was not visible on the next route.');
      }
    } catch (error) {
      addFailure(`Unhandled authentication smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'authentication-failure');
    }

    if (authFlow.consoleErrors.some((message) => message.includes('Could not reach Cloud Firestore backend'))) {
      addFailure(
        'Firestore reported backend connectivity problems during the authentication flow.',
        'User profile reads depend on Firestore, and those reads intermittently failed while auth state was changing.'
      );
    }
    if (hasMeaningfulFailures(authFlow)) {
      await saveArtifact(page, 'authentication-failure');
    }
    finalizeFlow('authentication');

    startFlow('community');
    try {
      await page.goto(`${baseUrl}/community`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Community');
      addCheck('Community list loaded.');

      const communityFlow = ensureFlow('community');
      const postTitle = `Smoke Post ${Date.now()}`;
      const postContent = 'This is an automated smoke test post for runtime verification.';
      const commentText = 'Smoke test comment verification.';
      const createCounts = getCounts(communityFlow);

    await page.getByRole('link', { name: /new post/i }).click();
    await waitForText(page, 'Create a Post');
    await page.getByLabel('Title').fill(postTitle);
    await page.getByLabel('Content').fill(postContent);
    await page.getByLabel('Tags (optional)').fill('smoke,playwright');
    await page.getByRole('button', { name: /publish post/i }).click();
    await page.waitForURL(/\/community\/[^/]+$/, { timeout: 30000 });
    await waitForText(page, postTitle);
    addCheck('Created a community post.');

    const createDelta = getNewRequestDelta(communityFlow, createCounts);
    if (createDelta.firestoreWrites > 0) {
      addCheck('Observed Firestore write traffic while creating the post.');
    } else {
      addNote('No new Firestore write request was isolated during post creation, but the post persisted and loaded on its own detail route.');
    }

    const commentCounts = getCounts(communityFlow);
    await page.locator('textarea').last().fill(commentText);
    await page.getByRole('button', { name: /post comment/i }).click();
    await waitForText(page, commentText, 30000);
    addCheck('Posted a comment and saw it render on the post detail page.');
    const commentDelta = getNewRequestDelta(communityFlow, commentCounts);
    if (commentDelta.firestoreWrites > 0) {
      addCheck('Observed Firestore write traffic while creating the comment.');
    }

    const upvoteButton = page.locator('button').filter({ has: page.locator('svg') }).nth(3);
    const voteCountButton = page.locator('button').filter({ hasText: /^\d+$/ }).first();
    const countBeforeText = (await voteCountButton.textContent()) || '0';
    const countBefore = Number.parseInt(countBeforeText.trim(), 10) || 0;
    const voteCounts = getCounts(communityFlow);
    await upvoteButton.click();
    await page.waitForTimeout(2500);
    const countAfterText = (await voteCountButton.textContent()) || '0';
    const countAfter = Number.parseInt(countAfterText.trim(), 10) || 0;
    if (countAfter >= countBefore + 1 || countAfter > 0) {
      addCheck('Upvote updated in the UI.');
    } else {
      addFailure('Vote did not visibly update after clicking upvote.', 'The optimistic update or server refresh path may be broken.');
    }
    const voteDelta = getNewRequestDelta(communityFlow, voteCounts);
    if (voteDelta.firestoreWrites > 0) {
      addCheck('Observed Firestore write traffic while voting on the post.');
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForText(page, postTitle);
    await waitForText(page, commentText);
    const persistedCountText = (await voteCountButton.textContent()) || '0';
    const persistedCount = Number.parseInt(persistedCountText.trim(), 10) || 0;
    if (persistedCount > 0) {
      addCheck('Post, comment, and vote state persisted after reload.');
    } else {
      addFailure('Vote count did not persist after reload.', 'The vote document may be written but not re-read correctly, or the count recomputation path may be failing.');
    }

    await page.goto(`${baseUrl}/community`, { waitUntil: 'domcontentloaded' });
    await waitForText(page, postTitle);
    addCheck('Created post appears in the community list.');

      if (hasMeaningfulFailures(communityFlow)) {
        addFailure('Community flow completed but emitted runtime or network errors.', 'Inspect console/page errors and failed requests collected for this flow.');
        await saveArtifact(page, 'community-failure');
      }
    } catch (error) {
      addFailure(`Unhandled community smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'community-failure');
    }
    finalizeFlow('community');

    startFlow('assessment');
    try {
      await page.goto(`${baseUrl}/quizpage`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Question 1 of 10');
      addCheck('Assessment started.');

      for (let i = 0; i < 10; i += 1) {
        const optionButtons = page.locator('div.max-w-2xl.mx-auto div.space-y-3 > button');
        await optionButtons.first().click();
        await page.waitForTimeout(2500);
      }

      await waitForText(page, 'Your Mental Health Assessment', 60000);
      addCheck('Assessment completed and results page rendered.');

      const assessmentFlow = ensureFlow('assessment');
      const assessmentCounts = getCounts(assessmentFlow);
      await page.getByRole('button', { name: /save results/i }).click();
      await waitForText(page, 'Saved!', 30000);
      addCheck('Assessment result saved from the results page.');
      const assessmentDelta = getNewRequestDelta(assessmentFlow, assessmentCounts);
      if (assessmentDelta.firestoreWrites > 0) {
        addCheck('Observed Firestore write traffic while saving the assessment.');
      } else {
        addFailure(
          'Assessment save completed without a visible Firestore write request.',
          'The save likely fell back to localStorage instead of cloud persistence.'
        );
      }

      await page.goto(`${baseUrl}/assessment-history`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Assessment History');
      await waitForText(page, 'Assessment Details', 30000);
      addCheck('Assessment history loaded saved results.');

      if (hasMeaningfulFailures(assessmentFlow)) {
        addFailure('Assessment flow completed but emitted runtime or network errors.', 'Inspect console/page errors and failed requests collected for this flow.');
        await saveArtifact(page, 'assessment-failure');
      }
    } catch (error) {
      addFailure(`Unhandled assessment smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'assessment-failure');
    }
    finalizeFlow('assessment');

    startFlow('mood-tracking');
    try {
      await page.goto(`${baseUrl}/mood-tracker`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Mood Tracker');
      const moodFlow = ensureFlow('mood-tracking');
      const moodCounts = getCounts(moodFlow);

      await page.getByRole('button', { name: /check in now/i }).click();
      await page.locator('textarea[placeholder="What\'s on your mind today?"]').fill('Mood tracking smoke test note.');
      await page.getByRole('button', { name: 'Exercise' }).click();
      await page.getByRole('button', { name: 'Calm' }).click();
      await page.getByRole('button', { name: /save entry/i }).click();
      await waitForText(page, 'Mood tracked for today!', 30000);
      await waitForText(page, 'Mood tracking smoke test note.', 30000);
      addCheck('Mood entry created and visible in history.');

      const moodDelta = getNewRequestDelta(moodFlow, moodCounts);
      if (moodDelta.firestoreWrites > 0) {
        addCheck('Observed Firestore write traffic while saving the mood entry.');
      } else {
        addFailure(
          'Mood entry persisted in the UI, but no Firestore write was observed during the save.',
          'The flow likely fell back to localStorage because authenticated Firestore persistence was unavailable.'
        );
      }

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Mood tracked for today!');
      await waitForText(page, 'Mood tracking smoke test note.');
      addCheck('Mood history persisted after reload.');

      if (hasMeaningfulFailures(moodFlow)) {
        addFailure('Mood tracking flow completed but emitted runtime or network errors.', 'Inspect console/page errors and failed requests collected for this flow.');
        await saveArtifact(page, 'mood-failure');
      }
    } catch (error) {
      addFailure(`Unhandled mood-tracking smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'mood-failure');
    }
    finalizeFlow('mood-tracking');

    startFlow('meditation');
    try {
      await page.goto(`${baseUrl}/meditation`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Meditation & Mindfulness');
      const meditationFlow = ensureFlow('meditation');
      const statCard = page.locator('div.text-4xl').first();
      const sessionsBefore = Number.parseFloat(((await statCard.textContent()) || '0').trim()) || 0;
      const meditationCounts = getCounts(meditationFlow);

      await page.getByText('Calm Breathing').first().click();
      await waitForText(page, 'Calm Breathing');
      await page.locator('input[type="range"]').evaluate((element) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(element, '90');
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      await page.waitForTimeout(500);
      await page.getByTitle('Stop meditation').click();
      await waitForText(page, 'added to your stats', 30000);
      addCheck('Meditation session completed through the player and success toast appeared.');

      const meditationDelta = getNewRequestDelta(meditationFlow, meditationCounts);
      if (meditationDelta.firestoreWrites > 0) {
        addCheck('Observed Firestore write traffic while saving the meditation session.');
      } else {
        addFailure(
          'Meditation session completed, but no Firestore write was observed during save.',
          'The session likely fell back to localStorage rather than cloud persistence.'
        );
      }

      await page.goto(`${baseUrl}/meditation`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Meditation & Mindfulness');
      const sessionsAfter = Number.parseFloat(((await page.locator('div.text-4xl').first().textContent()) || '0').trim()) || 0;
      if (sessionsAfter > sessionsBefore) {
        addCheck('Meditation stats persisted after reload.');
      } else {
        addFailure('Meditation session count did not increase after completion.', 'Session storage or stats refresh may be broken.');
      }

      if (hasMeaningfulFailures(meditationFlow)) {
        addFailure('Meditation flow completed but emitted runtime or network errors.', 'Inspect console/page errors and failed requests collected for this flow.');
        await saveArtifact(page, 'meditation-failure');
      }
    } catch (error) {
      addFailure(`Unhandled meditation smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'meditation-failure');
    }
    finalizeFlow('meditation');

    startFlow('brain-training');
    try {
      await page.goto(`${baseUrl}/brain-training/game/reaction-time`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Reaction Time Test');
      const brainFlow = ensureFlow('brain-training');
      const brainCounts = getCounts(brainFlow);

      await page.getByRole('button', { name: /start test/i }).click();
      await page.getByRole('button', { name: /begin test/i }).click();
      addCheck('Brain training game started.');

      const gameArea = page.locator('div.cursor-pointer').first();
      for (let i = 0; i < 7; i += 1) {
        if (await page.getByText('Test Complete!').isVisible().catch(() => false)) {
          break;
        }
        await waitForText(page, 'CLICK NOW!', 10000);
        await gameArea.click();
        await page.waitForTimeout(2400);
      }

      await waitForText(page, 'Test Complete!', 30000);
      addCheck('Brain training game session completed.');

      const brainDelta = getNewRequestDelta(brainFlow, brainCounts);
      if (brainDelta.firestoreWrites > 0) {
        addCheck('Observed Firestore write traffic while saving the brain training session.');
      } else {
        addFailure(
          'Brain training session completed, but no Firestore write was observed during save.',
          'The game result likely fell back to localStorage instead of cloud persistence.'
        );
      }

      await page.goto(`${baseUrl}/brain-training/progress`, { waitUntil: 'domcontentloaded' });
      await waitForText(page, 'Training Progress');
      const gamesPlayedText = await page.locator('div.text-2xl.font-bold.text-gray-800').first().textContent();
      const gamesPlayed = Number.parseInt((gamesPlayedText || '0').trim(), 10) || 0;
      if (gamesPlayed > 0) {
        addCheck('Brain training progress page shows saved session data.');
      } else {
        addFailure('Brain training progress did not show any saved sessions.', 'Session save or progress rebuild may be failing.');
      }

      if (hasMeaningfulFailures(brainFlow)) {
        addFailure('Brain training flow completed but emitted runtime or network errors.', 'Inspect console/page errors and failed requests collected for this flow.');
        await saveArtifact(page, 'brain-training-failure');
      }
    } catch (error) {
      addFailure(`Unhandled brain-training smoke error: ${error.message}`, error.stack);
      await saveArtifact(page, 'brain-training-failure');
    }
    finalizeFlow('brain-training');
  } catch (error) {
    addFailure(`Unhandled smoke test error: ${error.message}`, error.stack);
    try {
      await saveArtifact(page, `${currentFlow}-unhandled`);
    } catch {
      // Ignore screenshot failures during cleanup
    }
    if (!results.summary.broken.includes(currentFlow)) {
      results.summary.broken.push(currentFlow);
    }
  } finally {
    results.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(artifactDir, 'smoke-test-results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  results.fatalError = error.message;
  results.fatalStack = error.stack;
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(artifactDir, 'smoke-test-results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  process.exitCode = 1;
});
