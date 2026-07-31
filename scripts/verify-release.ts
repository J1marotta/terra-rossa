function requiredUrl(name: string, value: string | undefined) {
  if (value === undefined) throw new Error(`${name} is required.`);
  return new URL(value);
}

const clientUrl = requiredUrl('CLIENT_URL', process.env.CLIENT_URL);
const expectedVersion = process.env.EXPECTED_VERSION;
if (expectedVersion === undefined || expectedVersion.length === 0) {
  throw new Error('EXPECTED_VERSION is required.');
}

const htmlResponse = await fetch(clientUrl);
if (!htmlResponse.ok) {
  throw new Error(`Client request failed with ${htmlResponse.status}.`);
}
const html = await htmlResponse.text();
const scriptPaths = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].flatMap(
  (match) => (match[1] === undefined ? [] : [match[1]]),
);
if (scriptPaths.length === 0) throw new Error('Client has no script bundle.');

const bundles = await Promise.all(
  scriptPaths.map(async (path) => {
    const response = await fetch(new URL(path, clientUrl));
    if (!response.ok) {
      throw new Error(`Client bundle ${path} failed with ${response.status}.`);
    }
    return response.text();
  }),
);
if (!bundles.some((bundle) => bundle.includes(expectedVersion))) {
  throw new Error(
    `Client bundles do not contain expected version ${expectedVersion}.`,
  );
}

console.log(
  JSON.stringify({
    ok: true,
    client: clientUrl.toString(),
    version: expectedVersion,
    bundles: scriptPaths.length,
  }),
);
