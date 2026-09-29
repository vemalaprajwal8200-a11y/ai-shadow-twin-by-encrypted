/**
 * Unit tests for client-side role mapping, redirect functions, and route guard logic.
 * Uses Node.js built-in test runner ('node --test').
 * Run with: node --test scripts/test_roles.js
 * No real network or secret credentials used.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

// 1. Role mapping function test (mirrors AuthContext.jsx getProfileUser role resolution logic)
function resolveUserRole(dbRole, metaRole, requestedRole) {
  // Single source of truth: database profiles.role is authoritative
  if (dbRole === 'faculty') return 'faculty'
  if (dbRole === 'student') return 'student'

  // Fallback to metadata only if database record is not yet present
  if (metaRole === 'faculty' || requestedRole === 'faculty') return 'faculty'
  return 'student'
}

test('Role mapping prioritizes database profiles.role as single source of truth', () => {
  // Database says student, even if metadata says faculty -> role MUST be student
  assert.equal(resolveUserRole('student', 'faculty', 'faculty'), 'student')

  // Database says faculty, even if metadata says student -> role MUST be faculty
  assert.equal(resolveUserRole('faculty', 'student', 'student'), 'faculty')

  // Database not yet created (null): fallback to metadata role
  assert.equal(resolveUserRole(null, 'faculty', null), 'faculty')
  assert.equal(resolveUserRole(null, null, 'faculty'), 'faculty')
  assert.equal(resolveUserRole(null, 'student', null), 'student')

  // Invalid or empty roles default safely to 'student'
  assert.equal(resolveUserRole(null, 'admin', 'unknown'), 'student')
  assert.equal(resolveUserRole(null, null, null), 'student')
})

// 2. Redirect function test for each role (mirrors getDashboardPath in AuthContext.jsx)
function getDashboardPath(role) {
  return role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'
}

test('getDashboardPath redirects to correct dashboard for each role', () => {
  assert.equal(getDashboardPath('faculty'), '/faculty/dashboard')
  assert.equal(getDashboardPath('student'), '/student/dashboard')
  assert.equal(getDashboardPath(undefined), '/student/dashboard')
  assert.equal(getDashboardPath('unknown'), '/student/dashboard')
})

// 3. Route guard behavior test (mirrors RoleRoute check in RouteGuards.jsx)
function evaluateRoleRoute(userRole, allowedRoles, currentPath) {
  if (!userRole) {
    return { allow: false, redirect: '/login', state: { from: currentPath } }
  }
  if (!allowedRoles.includes(userRole)) {
    const userDashboard = getDashboardPath(userRole)
    return {
      allow: false,
      redirect: userDashboard,
      state: { accessDenied: true, intendedRole: allowedRoles[0], from: currentPath },
    }
  }
  return { allow: true }
}

test('RoleRoute allows authorized users', () => {
  const facultyOnFacultyRoute = evaluateRoleRoute('faculty', ['faculty'], '/courses')
  assert.equal(facultyOnFacultyRoute.allow, true)

  const studentOnStudentRoute = evaluateRoleRoute('student', ['student'], '/topics/dashboard/my-units')
  assert.equal(studentOnStudentRoute.allow, true)
})

test('RoleRoute rejects student attempting to access faculty routes and redirects to student dashboard', () => {
  const result = evaluateRoleRoute('student', ['faculty'], '/courses')
  assert.equal(result.allow, false)
  assert.equal(result.redirect, '/student/dashboard')
  assert.equal(result.state.accessDenied, true)
  assert.equal(result.state.intendedRole, 'faculty')
})

test('RoleRoute rejects faculty attempting to access student routes and redirects to faculty dashboard', () => {
  const result = evaluateRoleRoute('faculty', ['student'], '/student/dashboard')
  assert.equal(result.allow, false)
  assert.equal(result.redirect, '/faculty/dashboard')
  assert.equal(result.state.accessDenied, true)
  assert.equal(result.state.intendedRole, 'student')
})

test('RoleRoute rejects unauthenticated users and redirects to /login', () => {
  const result = evaluateRoleRoute(null, ['faculty'], '/report')
  assert.equal(result.allow, false)
  assert.equal(result.redirect, '/login')
})
