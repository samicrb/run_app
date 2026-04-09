import semver from 'semver';

/**
 * Normalizes a version string to valid SemVer format.
 * First tries to validate the version as-is.
 * Then tries to strip non-numeric prefixes (e.g. "release-", "ver-") to preserve pre-release tags.
 * Finally attempts coercion if invalid.
 *
 * @param version - Version string to normalize
 * @returns Valid SemVer string or null if cannot be parsed
 *
 * @example
 * normalizeVersion('1.0.0')        // '1.0.0' (already valid)
 * normalizeVersion('1.0.0-alpha')  // '1.0.0-alpha' (valid with pre-release)
 * normalizeVersion('release-1.0.0-alpha') // '1.0.0-alpha' (prefix stripped, pre-release preserved)
 * normalizeVersion('1.0')          // '1.0.0' (coerced)
 * normalizeVersion('v1.2.3')       // '1.2.3' (coerced)
 * normalizeVersion('invalid')      // null
 *
 */
export function normalizeVersion(version: string): string | null {
    // Try to use original version if it's already valid
    const validVersion = semver.valid(version);
    if (validVersion) {
        return validVersion;
    }

    // Try to strip non-numeric prefix and validate again
    // This preserves pre-release tags which semver.coerce() would strip
    // Matches starting from the first digit
    // match[0]: Full matched string (e.g. "1.2.3-beta.1")
    // match[1]: First capturing group (same as match[0] here because the whole pattern is captured)
    const match = version.match(/(\d+\.\d+\.\d+.*)/);
    if (match) {
        const potentialVersion = match[1];
        const validStripped = semver.valid(potentialVersion);
        if (validStripped) {
            return validStripped;
        }
    }

    // Fallback: coerce to valid semver format
    const coerced = semver.coerce(version);
    return coerced?.version ?? null;
}

/**
 * Compare versions which are formatted as Semantic Version (SemVer 2.0.0).
 *
 * This function uses the semver library to compare versions according to the Semantic Versioning specification.
 *
 * Version normalization:
 * - Valid SemVer versions are used as-is (e.g., '1.0.0', '1.0.0-alpha')
 * - Incomplete versions are coerced to valid SemVer (e.g., '1.0' → '1.0.0', 'v1.2.3' → '1.2.3')
 * - Invalid versions that cannot be parsed return 0 (treated as equal)
 *
 * Pre-release version precedence rules:
 * - A normal version has higher precedence than a pre-release version (e.g., 1.0.0 > 1.0.0-alpha)
 * - Pre-release identifiers are compared from left to right, separated by dots
 * - Numeric identifiers are compared numerically (e.g., 1 < 2 < 10)
 * - Alphanumeric identifiers are compared lexically in ASCII sort order (e.g., alpha < beta < rc)
 * - Numeric identifiers have lower precedence than non-numeric identifiers (e.g., 1 < alpha)
 * - A larger set of pre-release fields has higher precedence (e.g., 1.0.0-alpha < 1.0.0-alpha.1)
 *
 * @param srcVersion - Source version to compare
 * @param version - Target version to compare against
 * @returns -1 if srcVersion > version, 1 if srcVersion < version, 0 if equal or invalid
 *
 * @example
 * compareVersion('1.0.0', '2.0.0')           // returns 1 (1.0.0 < 2.0.0)
 * compareVersion('2.0.0', '1.0.0')           // returns -1 (2.0.0 > 1.0.0)
 * compareVersion('1.0.0', '1.0.0')           // returns 0 (equal)
 * compareVersion('1.0.0', '1.0.0-alpha')     // returns -1 (1.0.0 > 1.0.0-alpha)
 * compareVersion('1.0.0-alpha', '1.0.0-beta') // returns 1 (alpha < beta)
 * compareVersion('1.0.0-beta.2', '1.0.0-beta.11') // returns 1 (2 < 11, numeric comparison)
 * compareVersion('1.0', '1.0.0')             // returns 0 (coerced to same version)
 * compareVersion('v1.0.0', '1.0.0')          // returns 0 (v prefix removed)
 * compareVersion('invalid', 'version')       // returns 0 (both invalid, treated as equal)
 * compareVersion('1.0.0', 'invalid')         // returns 0 (one invalid, treated as equal)
 *
 * @apiVersion 3
 * @user
 */
export function compareVersion(srcVersion: string, version: string): number {
    try {
        const srcNormalized = normalizeVersion(srcVersion);
        const targetNormalized = normalizeVersion(version);

        // If either version cannot be parsed, treat as equal
        if (!srcNormalized || !targetNormalized) {
            return 0;
        }

        // Compare and invert result (semver.compare returns opposite of our convention)
        const result = semver.compare(srcNormalized, targetNormalized);
        return result === 0 ? 0 : -result;
    } catch (e) {
        return 0;
    }
}
