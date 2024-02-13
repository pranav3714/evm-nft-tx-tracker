require('dotenv').config();
const { default: mongoose } = require('mongoose');
const getRedisClient = require('../utils/redis');

mongoose.connect(process.env.DB_STRING);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to the database');
  try {
    await getRedisClient();
    // eslint-disable-next-line global-require
    require('./app');
    console.log('I am on!');
  } catch (error) {
    console.log('main error: ', error);
  }
});
