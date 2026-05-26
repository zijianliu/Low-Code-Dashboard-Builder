import Database from 'better-sqlite3';
import path from 'path';

let testDb: Database.Database | null = null;

beforeAll(() => {
  const testDbPath = path.join(__dirname, '../../data/test.db');
  testDb = new Database(testDbPath);
});

afterAll(() => {
  if (testDb) {
    testDb.close();
  }
});

beforeEach(() => {
  if (testDb) {
    testDb.exec('BEGIN TRANSACTION');
  }
});

afterEach(() => {
  if (testDb) {
    testDb.exec('ROLLBACK');
  }
});
