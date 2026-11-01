import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.GUESTBOOK_URL || 'http://guestbook:3000';

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-arrival-rate', // un nombre de requêtes/s, pas d'utilisateurs
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],   // moins de 1% d'erreurs
    http_req_duration: ['p(95)<500'], // 95% des requêtes en moins de 500 ms
  },
};

// Une visite = ce que fait le navigateur
export default function () {
  const page = http.get(`${BASE_URL}/`);
  check(page, { 'ui is 200': (r) => r.status === 200 });

  const messages = http.get(`${BASE_URL}/lrange/guestbook`);
  check(messages, { 'messages are 200': (r) => r.status === 200 });

  sleep(0.1);
}