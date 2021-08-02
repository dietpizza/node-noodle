import fetch, { Response } from 'node-fetch';

export interface AbortableFetch {
  abort(): void;
  ready: Promise<Response>;
}

export function abortableFetch(url: string, options: object) {
  const controller: AbortController = new AbortController();
  const { signal } = controller;

  const instance: AbortableFetch = {
    abort: controller.abort,
    ready: fetch(url, { ...options, signal }),
  };

  return instance;
}
