import fetch, { Response } from 'node-fetch';

export interface AdorableFetch {
  abort(): void;
  ready: Promise<Response>;
}

export function adorableFetch(url: string, options: object) {
  const controller: AbortController = new AbortController();
  const { signal } = controller;

  const instance: AdorableFetch = {
    abort: () => controller.abort(),
    ready: fetch(url, { ...options, signal }),
  };

  return instance;
}
