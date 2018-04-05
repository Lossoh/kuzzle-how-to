const
  Kuzzle = require('kuzzle-sdk'),
  fs = require('fs'),
  readline = require('readline'),
  program = require('commander');


program
  .option('--batch-size <size>', 'Size of each batch loaded in Kuzzle', 9999)
  .option('--max-count <count>', 'Max number of documents imported to Kuzzle (rounded to batch size)', 9999999)
  .parse(process.argv)

program.batchSize = parseInt(program.batchSize)
if (isNaN(program.batchSize)) {
  console.error('Error: invalid batch size');
  program.outputHelp();
  process.exit(1);
}

program.maxCount = parseInt(program.maxCount)
if (isNaN(program.maxCount)) {
  console.error('Error: invalid max count');
  program.outputHelp();
  process.exit(1);
}

const
  dataPath = '/yellow_taxi/yellow_taxi_data.csv',
  maxDocumentsCount = parseInt(program.maxCount),
  host = 'localhost',
  port = 7512,
  collection = 'yellow-taxi',
  index = 'nyc-open-data';


console.log(`Insert maximum of ${program.maxCount} documents in batch of ${program.batchSize}.`)

let
  inserted = 0,
  headerSkipped = false;

const kuzzle = new Kuzzle(host, { port: port }, error => {
  if (error) {
    console.error('Error: ', error);
    process.exit(1);
  }

  let documents = [];

  const dataFile = readline.createInterface({
    input: fs.createReadStream(dataPath)
  });

  dataFile.on('line', line => {
    if (headerSkipped) {
      const fields = line.split(',');

      documents.push({
        body: {
          pickup_datetime: fields[1],
          dropoff_datetime: fields[2],
          passenger_count: fields[3],
          trip_distance: fields[4],
          pickup_position: { lon: Number.parseFloat(fields[5]), lat: Number.parseFloat(fields[6]) },
          dropoff_position: { lon: Number.parseFloat(fields[9]), lat: Number.parseFloat(fields[10]) },
          fare_amount: fields[18]
        }
      });

      if (documents.length === program.batchSize) {
        const packet = documents;
        inserted += documents.length;
        documents = [];

        if (inserted - program.batchSize >= program.maxCount) {
          dataFile.close();
        } else {
          dataFile.pause();
          console.log(`Insert ${inserted} lines`);
          mcreate(packet).then(() => dataFile.resume());
        }
      }
    }
    else {
      headerSkipped = true;
    }
  });

  dataFile.on('close', () => {
    if (documents.length > 0) {
      mcreate(documents).then(() => kuzzle.disconnect());
    } else {
      kuzzle.disconnect();
    }
  });
});

function mcreate(docs) {
  return kuzzle.collection(collection, index)
    .mCreateDocumentPromise(docs)
    .catch(err => {
      console.dir(err, { depth: null, colors: true });
      process.exit(1);
    });
}
