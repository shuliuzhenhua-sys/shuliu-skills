export function subtractGrantedScopes(appScopes, grantedScope = "") {
  const granted = new Set(
    grantedScope
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  );

  return appScopes.filter((scope) => !granted.has(scope));
}

export function pickNextScopeBatch(scopes, batchSize) {
  return scopes.slice(0, Math.max(batchSize, 1));
}
