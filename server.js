require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB database'))
    .catch(err => console.error('Error connecting to the database', err));

const messageSchema = new mongoose.Schema({
    chatId: Number,
    apiKey: String,
    secretKey: String,
    cryptocurrency: String,
    notificationPrice: Number,
    date: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

const saveMessageToDB = async (chatId, apiKey, secretKey) => {
    try {
        let message = await Message.findOne({ chatId });
        if (message) {
            message.apiKey = apiKey;
            message.secretKey = secretKey;
        }
        else {
            message = new Message({ chatId, apiKey, secretKey, });
        }
        await message.save();
        console.log('Message saved in database');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

const savePrice = async (chatId, cryptocurrency, notificationPrice) => {
    try {
      let message = await Message.findOne({ chatId });
      if (message) {
        message.cryptocurrency = cryptocurrency;
        message.notificationPrice = notificationPrice;
      } else {
        message = new Message({
          chatId,
          cryptocurrency,
          notificationPrice
        });
      }
      await message.save();
      console.log('Price saved in database');
      return true;
    } catch (error) {
      console.error("An error occurred while saving the price in the database:", error);
      return false;
    }
  };
  
  

module.exports = {
    saveMessage: saveMessageToDB,
    savePrice: savePrice
};
