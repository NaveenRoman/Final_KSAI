const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('   KSAI PHASE P0 SECURITY REMEDIATION TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const testId = Date.now();
  const testUsersToClean = [];

  try {
    // -----------------------------------------------------------
    // TEST 1: Signup Role Tampering Prevention (New User)
    // -----------------------------------------------------------
    console.log('\n--- Test 1: Signup Role Tampering Prevention ---');
    const tamperEmail = `test-tamper-${testId}@testksai.local`;
    testUsersToClean.push(tamperEmail);

    // Create email verification record so OTP check passes
    await prisma.verification.create({
      data: {
        id: `ver-${testId}`,
        identifier: `verified:${tamperEmail}`,
        value: '123456',
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      },
    });

    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker User',
        email: tamperEmail,
        password: 'Password123!',
        role: 'SUPER_ADMIN', // Malicious role escalation attempt
      }),
    });

    const signupJson = await signupRes.json();
    assert(signupRes.status === 200, `Signup returns 200 (status: ${signupRes.status})`);

    const createdUser = await prisma.user.findUnique({
      where: { email: tamperEmail },
    });

    assert(createdUser !== null, 'User record created in DB');
    assert(createdUser.role !== 'SUPER_ADMIN', `User role is NOT SUPER_ADMIN (actual: "${createdUser.role}")`);
    assert(
      createdUser.role.toUpperCase() === 'STUDENT',
      `User role is forced to STUDENT (actual: "${createdUser.role}")`
    );

    // -----------------------------------------------------------
    // TEST 2: Google Identity Spoofing / OTP Bypass Prevention
    // -----------------------------------------------------------
    console.log('\n--- Test 2: Google Identity Spoofing / OTP Bypass ---');
    const spoofEmail = `test-spoof-${testId}@testksai.local`;
    testUsersToClean.push(spoofEmail);

    // Attempt signup without verification record, but passing fake googleId
    const spoofRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spoofer User',
        email: spoofEmail,
        password: 'Password123!',
        googleId: 'fake-google-id-12345',
        role: 'SUPER_ADMIN',
      }),
    });

    const spoofJson = await spoofRes.json();
    assert(spoofRes.status === 403, `Unverified signup with spoofed googleId rejected with 403 (actual: ${spoofRes.status})`);
    assert(
      spoofJson.error && spoofJson.error.includes('Email verification is required'),
      `Correct error returned: "${spoofJson.error}"`
    );

    const spoofedUser = await prisma.user.findUnique({
      where: { email: spoofEmail },
    });
    assert(spoofedUser === null, 'No user was created from spoofed Google registration');

    // -----------------------------------------------------------
    // TEST 3: Google Profile Completion Role Preservation
    // -----------------------------------------------------------
    console.log('\n--- Test 3: Google Profile Completion Role Preservation ---');
    const googleUserEmail = `test-google-${testId}@testksai.local`;
    testUsersToClean.push(googleUserEmail);

    // Create an existing Google student user with an Account record
    const existingGoogleUser = await prisma.user.create({
      data: {
        id: `usr-google-${testId}`,
        email: googleUserEmail,
        name: 'Legit Google Student',
        role: 'STUDENT',
        accounts: {
          create: {
            id: `acc-google-${testId}`,
            providerId: 'google',
            accountId: `gid-${testId}`,
          },
        },
      },
    });

    // Profile completion attempt passing role: SUPER_ADMIN
    const completeRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Legit Google Student Updated',
        email: googleUserEmail,
        password: 'NewPassword123!',
        phone: '9876543210',
        collegeName: 'Test College',
        department: 'CSE',
        currentYear: 'B.Tech IV',
        role: 'SUPER_ADMIN', // Attempted role escalation
      }),
    });

    const completeJson = await completeRes.json();
    assert(completeRes.status === 200, `Profile completion returns 200 (status: ${completeRes.status})`);

    const updatedGoogleUser = await prisma.user.findUnique({
      where: { email: googleUserEmail },
    });
    assert(
      updatedGoogleUser.role === 'STUDENT',
      `Existing user role was preserved as STUDENT, not elevated (actual: "${updatedGoogleUser.role}")`
    );

    // -----------------------------------------------------------
    // TEST 4: Unauthenticated Admin Access Gate
    // -----------------------------------------------------------
    console.log('\n--- Test 4: Unauthenticated Admin Access Gate ---');

    // Check /admin
    const unauthAdminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert(
      unauthAdminRes.status === 307 || unauthAdminRes.status === 302,
      `/admin redirects unauthenticated user (status: ${unauthAdminRes.status})`
    );
    assert(
      (unauthAdminRes.headers.get('location') || '').includes('/auth'),
      `/admin redirects to /auth (location: ${unauthAdminRes.headers.get('location')})`
    );

    // Check /admin/contests (previously unprotected client component)
    const unauthContestsRes = await fetch(`${BASE_URL}/admin/contests`, { redirect: 'manual' });
    assert(
      unauthContestsRes.status === 307 || unauthContestsRes.status === 302,
      `/admin/contests redirects unauthenticated user (status: ${unauthContestsRes.status})`
    );
    assert(
      (unauthContestsRes.headers.get('location') || '').includes('/auth'),
      `/admin/contests redirects to /auth (location: ${unauthContestsRes.headers.get('location')})`
    );

    // -----------------------------------------------------------
    // TEST 5: Student Access Isolation (Role Gate)
    // -----------------------------------------------------------
    console.log('\n--- Test 5: Student Access Isolation ---');
    const studentEmail = `test-student-${testId}@testksai.local`;
    testUsersToClean.push(studentEmail);
    const studentToken = `test-tok-student-${testId}-${crypto.randomBytes(16).toString('hex')}`;

    const studentUser = await prisma.user.create({
      data: {
        id: `usr-stu-${testId}`,
        email: studentEmail,
        name: 'Normal Student',
        role: 'STUDENT',
        sessions: {
          create: {
            id: `sess-stu-${testId}`,
            token: studentToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          },
        },
      },
    });

    const studentCookie = `better-auth.session_token=${studentToken}`;

    // Student requesting /admin
    const studentAdminRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: studentCookie },
      redirect: 'manual',
    });
    assert(
      studentAdminRes.status === 307 || studentAdminRes.status === 302,
      `Student requesting /admin is redirected (status: ${studentAdminRes.status})`
    );
    assert(
      (studentAdminRes.headers.get('location') || '').includes('/dashboard/student'),
      `Student redirected to /dashboard/student (location: ${studentAdminRes.headers.get('location')})`
    );

    // Student requesting /admin/contests
    const studentContestsRes = await fetch(`${BASE_URL}/admin/contests`, {
      headers: { Cookie: studentCookie },
      redirect: 'manual',
    });
    assert(
      studentContestsRes.status === 307 || studentContestsRes.status === 302,
      `Student requesting /admin/contests is redirected (status: ${studentContestsRes.status})`
    );
    assert(
      (studentContestsRes.headers.get('location') || '').includes('/dashboard/student'),
      `Student on /admin/contests redirected to /dashboard/student (location: ${studentContestsRes.headers.get('location')})`
    );

    // Student requesting /api/admin/dashboard
    const studentApiRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentApiRes.status === 401, `Student requesting /api/admin/dashboard returns 401 Unauthorized (actual: ${studentApiRes.status})`);

    // Student requesting /api/admin/contests
    const studentContestsApiRes = await fetch(`${BASE_URL}/api/admin/contests`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentContestsApiRes.status === 401, `Student requesting /api/admin/contests returns 401 Unauthorized (actual: ${studentContestsApiRes.status})`);

    // -----------------------------------------------------------
    // TEST 6: Super Admin Access & Admin API Verification
    // -----------------------------------------------------------
    console.log('\n--- Test 6: Super Admin Access & Admin API Verification ---');
    const adminEmail = `test-admin-${testId}@testksai.local`;
    testUsersToClean.push(adminEmail);
    const adminToken = `test-tok-admin-${testId}-${crypto.randomBytes(16).toString('hex')}`;

    const superAdminUser = await prisma.user.create({
      data: {
        id: `usr-adm-${testId}`,
        email: adminEmail,
        name: 'Real Super Admin',
        role: 'SUPER_ADMIN',
        sessions: {
          create: {
            id: `sess-adm-${testId}`,
            token: adminToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          },
        },
      },
    });

    const adminCookie = `better-auth.session_token=${adminToken}`;

    // Admin requesting /api/admin/dashboard
    const adminDashboardRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: adminCookie },
    });
    const adminDashboardJson = await adminDashboardRes.json();
    assert(adminDashboardRes.status === 200, `Super Admin requesting /api/admin/dashboard returns 200 (actual: ${adminDashboardRes.status})`);
    assert(adminDashboardJson.success === true, 'Dashboard API returned success: true');

    // Admin requesting /api/admin/stats
    const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: adminCookie },
    });
    const adminStatsJson = await adminStatsRes.json();
    assert(adminStatsRes.status === 200, `Super Admin requesting /api/admin/stats returns 200 (actual: ${adminStatsRes.status})`);
    assert(adminStatsJson.success === true, 'Stats API returned success: true');

    // Admin requesting /api/admin/contests
    const adminContestsRes = await fetch(`${BASE_URL}/api/admin/contests`, {
      headers: { Cookie: adminCookie },
    });
    const adminContestsJson = await adminContestsRes.json();
    assert(adminContestsRes.status === 200, `Super Admin requesting /api/admin/contests returns 200 (actual: ${adminContestsRes.status})`);
    assert(adminContestsJson.success === true, 'Contests API returned success: true');

    // -----------------------------------------------------------
    // TEST 7: Role Consistency in Subscription & Editor Access
    // -----------------------------------------------------------
    console.log('\n--- Test 7: Role Consistency in Subscription & Editor Access ---');

    // 7A: Canonical SUPER_ADMIN user subscription status
    const adminSubRes = await fetch(`${BASE_URL}/api/subscription/status`, {
      headers: { Cookie: adminCookie },
    });
    const adminSubJson = await adminSubRes.json();
    assert(adminSubRes.status === 200, `Super Admin /api/subscription/status returns 200 (status: ${adminSubRes.status})`);
    assert(adminSubJson.isAdmin === true, 'Canonical SUPER_ADMIN has isAdmin: true in subscription status');
    assert(adminSubJson.plan === 'PRO', 'Canonical SUPER_ADMIN is granted PRO plan');

    // 7B: Canonical SUPER_ADMIN user accessible languages
    const adminLangRes = await fetch(`${BASE_URL}/api/editor/accessible-languages`, {
      headers: { Cookie: adminCookie },
    });
    const adminLangJson = await adminLangRes.json();
    assert(adminLangRes.status === 200, `Super Admin /api/editor/accessible-languages returns 200 (status: ${adminLangRes.status})`);
    assert(adminLangJson.isAdmin === true, 'Canonical SUPER_ADMIN has isAdmin: true in accessible-languages');
    assert(adminLangJson.accessibleLanguageIds && adminLangJson.accessibleLanguageIds.length >= 4, 'Canonical SUPER_ADMIN has access to all editor languages');

    // 7C: Legacy Admin user ('Admin' string)
    const legacyAdminEmail = `test-legacy-${testId}@testksai.local`;
    testUsersToClean.push(legacyAdminEmail);
    const legacyAdminToken = `test-tok-leg-${testId}-${crypto.randomBytes(16).toString('hex')}`;
    const legacyAdminUser = await prisma.user.create({
      data: {
        id: `usr-leg-${testId}`,
        email: legacyAdminEmail,
        name: 'Legacy Admin',
        role: 'Admin', // Legacy string
        sessions: {
          create: {
            id: `sess-leg-${testId}`,
            token: legacyAdminToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          },
        },
      },
    });
    const legacyCookie = `better-auth.session_token=${legacyAdminToken}`;

    const legacySubRes = await fetch(`${BASE_URL}/api/subscription/status`, {
      headers: { Cookie: legacyCookie },
    });
    const legacySubJson = await legacySubRes.json();
    assert(legacySubJson.isAdmin === true, 'Legacy role "Admin" has isAdmin: true in subscription status');
    assert(legacySubJson.plan === 'PRO', 'Legacy role "Admin" is granted PRO plan');

    const legacyLangRes = await fetch(`${BASE_URL}/api/editor/accessible-languages`, {
      headers: { Cookie: legacyCookie },
    });
    const legacyLangJson = await legacyLangRes.json();
    assert(legacyLangJson.isAdmin === true, 'Legacy role "Admin" has isAdmin: true in accessible-languages');

    // 7D: Student user without subscription
    const studentSubRes = await fetch(`${BASE_URL}/api/subscription/status`, {
      headers: { Cookie: studentCookie },
    });
    const studentSubJson = await studentSubRes.json();
    assert(studentSubJson.hasActiveSubscription === false, 'Student without subscription has hasActiveSubscription: false');
    assert(studentSubJson.isAdmin !== true, 'Student does NOT have isAdmin flag in subscription status');

    const studentLangRes = await fetch(`${BASE_URL}/api/editor/accessible-languages`, {
      headers: { Cookie: studentCookie },
    });
    const studentLangJson = await studentLangRes.json();
    assert(studentLangJson.isAdmin !== true, 'Student does NOT have isAdmin in accessible-languages');

  } catch (err) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    // Clean up test data safely
    console.log('\n--- Cleaning up test records ---');
    for (const email of testUsersToClean) {
      try {
        const u = await prisma.user.findUnique({ where: { email } });
        if (u) {
          await prisma.session.deleteMany({ where: { userId: u.id } });
          await prisma.account.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }
      } catch (cleanErr) {
        // Ignore cleanup errors
      }
    }
    await prisma.verification.deleteMany({
      where: { identifier: { contains: `test-` } },
    });
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
