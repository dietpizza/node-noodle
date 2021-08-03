import fetch, { Response } from 'node-fetch';

export interface Neofetch {
  abort(): void;
  ready: Promise<Response>;
}

export function neofetch(url: string, options: object) {
  const controller: AbortController = new AbortController();
  const { signal } = controller;

  const instance: Neofetch = {
    abort: () => controller.abort(),
    ready: fetch(url, { ...options, signal }),
  };

  return instance;
}
