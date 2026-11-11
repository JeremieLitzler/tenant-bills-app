// Helpers shared by the Netlify function specs: build an event and read a response.
import type { HandlerContext, HandlerEvent, HandlerResponse } from '@netlify/functions'

export const CONTEXT = {} as HandlerContext

export function buildEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'http://localhost:8888/.netlify/functions/test',
    rawQuery: '',
    path: '/.netlify/functions/test',
    httpMethod: 'GET',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    ...overrides,
  }
}

export function expectResponse(result: HandlerResponse | void): HandlerResponse {
  if (!result) {
    throw new Error('handler did not return a response')
  }
  return result
}

export function setCookies(response: HandlerResponse): string[] {
  return (response.multiValueHeaders?.['Set-Cookie'] ?? []).map(String)
}
