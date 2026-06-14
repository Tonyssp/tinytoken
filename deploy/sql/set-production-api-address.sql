BEGIN;

UPDATE options
SET value = 'https://api.tinyapi.org'
WHERE key = 'ServerAddress';

COMMIT;

SELECT key, value
FROM options
WHERE key = 'ServerAddress';
