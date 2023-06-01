require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Подключено к базе данных MongoDB'))
    .catch(err => console.error('Ошибка подключения к базе данных', err));

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
        console.log('Сообщение сохранено в базе данных');
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
      console.log('Цена сохранена в базе данных');
      return true;
    } catch (error) {
      console.error("Произошла ошибка при сохранении цены в базе данных:", error);
      return false;
    }
  };
  
  

module.exports = {
    saveMessage: saveMessageToDB,
    savePrice: savePrice
};