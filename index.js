require('dotenv').config();
const TelegramApi = require("node-telegram-bot-api");
const Binance = require('node-binance-api');


const bot = new TelegramApi(process.env.BOT_TOKEN, { polling: true });
const binance = new Binance().options({
        APIKEY: 'BByyBgaZ3GnLbZ1BLIReqSs73ibVGKrJjAU1CIi9gSLZtwjRRdw4W7D5ULBLQZr3',
        APISECRET: 'OPZeCjyX1PRM4xqYD1QeyGwlgO0iyDUo4xR50Id12gAoMyk4i05hgg3ekI8rSoYh',
        family: 4,
})


bot.onText(/start/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "Enter your Binance API").then(() => {
        bot.on("message", (msg) => {
            const chatId = msg.chat.id;
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: 'Check balance', callback_data: 'Check balance' }, { text: 'Send crypto', callback_data: 'Send crypto' }, { text: 'Transaction history', callback_data: 'Transaction history' }
                    ],
                    [
                        { text: 'Create order', callback_data: 'Create order' }
                    ]
                ],
                resize_keyboard: true
            };
            bot.sendMessage(chatId, "You have successfully logged in", { reply_markup: keyboard });

        });
        
        bot.on('callback_query', (query) => {
            const chatId = query.message.chat.id;
            const action = query.data;

            if (action === 'Check balance') {
                binance.useServerTime(() =>
                    binance.balance((error, balances) => {
                        if (error) return console.error(error.body);
                        console.log("balances()", balances);
                        let message = '';
                        for (const asset in balances) {
                            if (balances[asset].available > 0) {
                              message += `${asset}: ${balances[asset].available} / usd \n`;
                            }
                          }
                          if (message !== '') {
                            bot.sendMessage(chatId , `You Binance balance:\n${message}`);
                          }
            
            }));}
            bot.answerCallbackQuery(query.id);

        });
    });
});