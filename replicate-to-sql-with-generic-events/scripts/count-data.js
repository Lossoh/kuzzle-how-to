const { Kuzzle, WebSocket } = require('kuzzle-sdk');
const { PostgresWrapper, pgConfigDocker } = require('../lib/postgres');

const kuzzle = new Kuzzle(new WebSocket('localhost'));

async function countFromPostgres() {
  const postgres = new PostgresWrapper(pgConfigDocker);
  try {
    const pgResponse = await postgres.countData();
    return pgResponse.rows[0].count;
  }
  finally {
    await postgres.disconnect();
  }
}

async function run() {
  try {
    const indexName = 'nyc-open-data';
    const collectionName = 'yellow-taxi';
    await kuzzle.connect();
    const count = await kuzzle.document.count(indexName, collectionName);
    const pgCount = await countFromPostgres();
    console.log(`Documents : ${count}, ${pgCount}`);
  }
  finally {
    kuzzle.disconnect();
  }
}

run();
