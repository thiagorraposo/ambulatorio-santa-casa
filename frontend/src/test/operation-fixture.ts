/** Fixtures for component tests whose subject is the clinical request after registration. */
export function withRegisteredOperations(fetcher: typeof fetch): typeof fetch {
  return async (url, init) => {
    if (url === '/v1/operacoes' && init?.method === 'POST') {
      const intention = JSON.parse(String(init.body)) as Record<string, unknown>;
      return Response.json({ ...intention, estado: 'registrada', expiraEm: '2099-01-01T00:00:00.000Z' }, { status: 201 });
    }
    return fetcher(url, init);
  };
}
