
const Datastore = require('@google-cloud/datastore');
//const config = require('config.json');

// const ds = Datastore({
//   projectId: config.get('GCLOUD_PROJECT')
// });

const ds = Datastore({
  projectId: "hotelhelper-193722"
});

const kind = 'User';

//Helper function
function fromDatastore (obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}

//Helper function
function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  const results = [];
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}


function update (id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description'])
  };

  ds.save(
    entity,
    (err) => {
      data.id = entity.key.id;
      cb(err, err ? null : data);
    }
  );
}

function create (data, cb) {
  update(null, data, cb);
}

function listByUsername (userName, cb) {
  const q = ds.createQuery([kind])
    .filter('email', '=', userName)
 

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }

    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

function listByPassword (password, cb) {
  const q = ds.createQuery([kind])
    .filter('password', '=', password)

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }

    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

function read (id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found'
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete(id, callback) {
   const cardKey = ds.key([kind, parseInt(id, 10)]);
   ds.delete(cardKey, callback);
}

module.exports = {
  create,
  read,
  update,
  delete: _delete,
  listByUsername,
  listByPassword

};