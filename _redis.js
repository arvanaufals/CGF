import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = new Redis({ url, token });
export const KEY = 'mist:state';
export const LOW_WATER = 10; // % di bawah ini mist maker dipaksa OFF
export const ONLINE_TIMEOUT_MS = 15000;

export const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';
