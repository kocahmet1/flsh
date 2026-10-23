import { buildQuery, isFirebaseHost, namespaceFromDatabaseUrl } from '../src/utils/rtdbUrl';

describe('database URLs', () => {
  test('namespace from production and emulator-style URLs', () => {
    expect(namespaceFromDatabaseUrl('https://flashcard3-e9cf1-default-rtdb.firebaseio.com')).toBe(
      'flashcard3-e9cf1-default-rtdb'
    );
    expect(namespaceFromDatabaseUrl('https://my-db.europe-west1.firebasedatabase.app/')).toBe('my-db');
    expect(namespaceFromDatabaseUrl('http://127.0.0.1:9000/?ns=demo-flsh')).toBe('demo-flsh');
    expect(namespaceFromDatabaseUrl('http://localhost:9000?ns=a%2Db')).toBe('a-b');
    expect(namespaceFromDatabaseUrl('http://localhost:9000')).toBe('');
    expect(namespaceFromDatabaseUrl(undefined)).toBe('');
  });

  test('production hosts are recognised', () => {
    expect(isFirebaseHost('x.firebaseio.com')).toBe(true);
    expect(isFirebaseHost('x.europe-west1.firebasedatabase.app')).toBe(true);
    expect(isFirebaseHost('127.0.0.1:9000')).toBe(false);
  });

  test('query strings are encoded and skip empty values', () => {
    expect(buildQuery({ orderBy: '"$key"', shallow: 'true', auth: undefined, ns: null })).toBe(
      'orderBy=%22%24key%22&shallow=true'
    );
  });
});
