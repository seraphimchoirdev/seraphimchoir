// Web API polyfills (Jest 테스트 환경에서 사용)
// 이 파일은 다른 모듈이 임포트되기 전에 로드되어야 함

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream } = require('stream/web');

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
});

// Request, Response, Headers polyfill
const { Request, Response, Headers, FormData, File } = require('undici');

Object.assign(global, {
  Request,
  Response,
  Headers,
  FormData,
  File,
});
