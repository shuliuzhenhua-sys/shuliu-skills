function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyCause(error) {
  const code = error?.cause?.code;
  const causeMessage = error?.cause?.message;
  if (code || causeMessage) {
    return ` cause=${code ?? "unknown"} ${causeMessage ?? ""}`.trimEnd();
  }
  return "";
}

export async function fetchWithRetry(url, options = {}, params = {}) {
  const retries = Number.isInteger(params.retries) ? params.retries : 2;
  const context = params.context ?? "request";

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep((attempt + 1) * 300);
        continue;
      }
    }
  }

  const suffix = stringifyCause(lastError);
  throw new Error(
    `${context} fetch failed: ${lastError?.message ?? String(lastError)}${suffix}; url=${url}`,
  );
}
