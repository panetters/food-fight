const db = require('../database-postgresql/models');
const bcrypt = require('bcrypt');
const uniqueString = require('unique-string');

// db.sequelize.query('SELECT * FROM users').spread((results) => {
//   console.log('AAAAAAAAAAAAAAA', results[0]);
// })

//
// ─── USER TABLE HELPERS ─────────────────────────────────────────────────────────
//
const saveMember = (email, password, zipcode, callback) => {
  let hashedPW;
  if (password) {
    const salt = bcrypt.genSaltSync(3);
    hashedPW = bcrypt.hashSync(password, salt);
  }
  db.models.User.create({
    email,
    password: hashedPW,
    zipcode,
  })
    .then((result) => {
      callback(result);
    })
    .catch((error) => {
      console.log(error);
    });
};

const saveRoomAndMembers = (roomName, zip, members, id, callback) => {
  const promisedMembers = members.map(memberEmail => db.models.User.findOne({
    where: {
      email: memberEmail,
    },
  }));

  db.models.Room.findOrCreate({
    where: {
      name: roomName,
      uniqueid: id,
      zipcode: zip,
    },
  })
    .then((room) => {
      Promise.all(promisedMembers)
        .then((users) => {
          users.forEach((user) => {
            room[0].addUser(user);
          });
          callback(null, room, users);
        })
        .catch((error) => {
          console.log(error);
        });
    })
    .catch((error) => {
      console.log(error);
    });
};

//
// ─── MESSAGE TABLE HELPERS ─────────────────────────────────────────────────────────
//
const saveMessage = (user_id, name, message, roomID, callback) => {
  console.log('Saving message', user_id, name, message, roomID);
  db.models.Room.findOne({
    where: {
      uniqueid: roomID,
    },
    attributes: ['id'],
    raw: true,
  })
    .then((primaryID) => {
      db.models.Message.create({
        name,
        message,
        room_id: primaryID.id,
      })
        .then((savedMessage) => {
          console.log('CREATED MESSAGE', savedMessage);
          callback(null, savedMessage);
        })
        .catch((error) => {
          callback(error);
        });
    })
    .catch((error) => {
      callback(error);
    });
};

const getMessages = (roomID, callback) => {
  db.models.Message.findAll({
    attributes: ['user_id', 'name', 'message'],
    include: [{
      model: db.models.Room,
      where: { uniqueid: roomID },
      attributes: [],
    }],
    raw: true,
  })
    .then((fetchedMessage) => {
      console.log('FETCHED MESSAGES', fetchedMessage);
      callback(null, fetchedMessage);
    })
    .catch((error) => {
      callback(error);
    });
};

//
// ─── ROOM TABLE HELPERS ─────────────────────────────────────────────────────────
//
const getRoomMembers = (roomID, callback) => {
  db.models.User.findAll({
    attributes: ['email', 'zipcode'],
    include: [{
      model: db.models.Room,
      where: { uniqueid: roomID },
      attributes: ['name', 'zipcode'],
      through: { attributes: [] },
    }],
  })
    .then((users) => {
      // console.log('Success getting users', users);
      callback(null, users);
    })
    .catch((error) => {
      callback(error);
    });
};

const getRooms = (email, callback) => {
    //Joseph using SQL to get user's rooms
    let sqlQuery = `SELECT rooms.id AS room_id, rooms.uniqueid AS room_uniqueid, rooms.name AS room_name 
    FROM room_users 
    FULL JOIN rooms 
    ON room_users.room_id = rooms.id  
    WHERE room_users.user_id = 
    (SELECT ID FROM users WHERE email = '${email}');`
    console.log(sqlQuery)
    db.sequelize.query(sqlQuery).spread((results) => {
      console.log('ROOOOOOOOOOOOMS', results);
      callback(null, results)
    })
};

//
// ─── RESTAURANT TABLE HELPERS ─────────────────────────────────────────────────────────
//
const saveRestaurant = (name, roomID, callback) => {
  const promisedRoom = db.models.Room.findOne({
    where: {
      uniqueid: roomID,
    },
    attributes: ['id'],
    raw: true,
  });

  db.models.Restaurant.create({
    name,
  })
    .then((restaurant) => {
      Promise.all([promisedRoom])
        .then((room) => {
          restaurant.setRoom(room[0].id);
          callback(null, restaurant);
        })
        .catch((error) => {
          callback(error);
        });
    })
    .catch((error) => {
      callback(error);
    });
};

const updateVotes = (voter, restaurant_id, name, roomId, callback) => {
  db.models.Restaurant.findOne({
    where: {
      name,
    },
    include: [{
      model: db.models.Room,
      where: {
        uniqueid: roomId,
      },
    }],
  })
    .then((restaurant) => {
      const currentVotes = restaurant.dataValues.votes;
      restaurant.update({
        votes: currentVotes + 1,
      })
        .then((result) => {
          callback(null, result);
        })
        .catch((error) => {
          callback(error);
        });
    })
    .catch((error) => {
      callback(error);
    });

    //Joseph using SQL to update votes table
    let strippedName = name.replace("'", '`');
    let sqlQuery = `INSERT INTO votes (restaurant_id, roomuniqueid, useremail, name, upvoted, created, updated) VALUES ('${restaurant_id}', '${roomId}', '${voter}', '${strippedName}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
    console.log(sqlQuery)
    db.sequelize.query(sqlQuery).spread((results) => {
      console.log('AAAAAAAAAAAAAAA', results[0]);
    })
};

const updateVetoes = (name, roomId, callback) => {
  db.models.Restaurant.findOne({
    where: {
      name,
    },
    include: [{
      model: db.models.Room,
      where: {
        uniqueid: roomId,
      },
    }],
  })
    .then((restaurant) => {
      restaurant.update({
        vetoed: true,
      })
        .then((result) => {
          callback(null, result);
        })
        .catch((error) => {
          callback(error);
        });
    })
    .catch((error) => {
      callback(error);
    });
};

const getScoreboard = (roomID, callback) => {
  db.models.Restaurant.findAll({
    attributes: ['name', 'votes', 'vetoed'],
    include: [{
      model: db.models.Room,
      where: { uniqueid: roomID },
      attributes: [],
    }],
    raw: true,
  })
    .then((scores) => {
      console.log('SCOREBOARD', scores);
      // callback(null, scores);
    })
    .catch((error) => {
      callback(error);
    });
  
  let sqlQuery = `SELECT votes.restaurant_id, votes.name, CAST(votes.votes AS int), CASE WHEN vetoes.vetoes > 0 THEN true ELSE false END as vetoed 
  FROM (
    (SELECT restaurant_id, name, count(upvoted) as votes 
    FROM votes WHERE roomuniqueid = '${roomID}' AND upvoted = true GROUP BY restaurant_id, roomuniqueid, name) votes FULL JOIN 
    (SELECT restaurant_id, name, count(upvoted) as vetoes FROM votes WHERE roomuniqueid = '${roomID}' AND upvoted = false 
    GROUP BY restaurant_id, roomuniqueid, name) vetoes ON votes.restaurant_id = vetoes.restaurant_id);`
  db.sequelize.query(sqlQuery).spread((results) => {
    console.log('GET VOTES', results);
    callback(null, results);
  })
};

module.exports = {
  saveMember,
  saveRoomAndMembers,
  getRoomMembers,
  saveRestaurant,
  updateVotes,
  updateVetoes,
  getScoreboard,
  saveMessage,
  getMessages,
  getRooms,
};
