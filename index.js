const TelegramApi = require("node-telegram-bot-api");
const https = require('https');
const axios = require('axios');
require('dotenv').config();
const { saveMessage } = require('./server');

const bot = new TelegramApi(process.env.BOT_TOKEN, { polling: true });

let apiKey = '';
let secretKey = '';

bot.setMyCommands([
    { command: '/start', description: 'Start the bot' },
    { command: '/options', description: 'Enter your API and secret key here' },
    { command: '/features', description: 'All available features' },
    { command: '/help', description: 'All available commands' },
]);

const agent = new https.Agent({
    rejectUnauthorized: false
});
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "Welcome to BinanceHelper");
    bot.sendMessage(chatId, "Write a /help to find out all existing commands");
});

bot.onText(/\/features/, (msg) => {
    const chatId = msg.chat.id;
    const keyboard = {
        inline_keyboard: [
            [
                { text: 'My wallet', callback_data: 'My wallet' }
            ],
            [
                { text: 'Crypto News', callback_data: 'Crypto News' }, { text: 'Current price', callback_data: 'Current price' }, 
            ]
        ],
        resize_keyboard: true
    };
    bot.sendMessage(chatId, "Features", { reply_markup: keyboard });
});

bot.onText(/\/options/, (msg) => {
    apiKey = '';
    secretKey = '';
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Enter your Api Key:');

    bot.once('message', async (msg) => {
        const chatId = msg.chat.id;
        const message = msg.text;

        if (message.length > 10) {
            apiKey = message;
            bot.sendMessage(chatId, 'Enter your Secret Key:');
        } else {
            bot.sendMessage(chatId, 'API Key is too short. Please enter a valid API Key.');
        }

        bot.once('message', async (msg) => {
            const chatId = msg.chat.id;
            const message = msg.text;

            if (message.length > 10) {
                secretKey = message;
                if (apiKey && secretKey) {
                    saveMessage(chatId, apiKey, secretKey);
                }
                await bot.sendMessage(chatId, `Your API Key: ${apiKey}\nYour Secret Key: ${secretKey}`);
                bot.sendMessage(chatId, "Send /features to find out our features");
            } else {
                await bot.sendMessage(chatId, 'Secret Key is too short. Please enter a valid Secret Key.');
                bot.sendMessage(chatId, 'ERROR: Type /options and try again');
            }
        });
    });
});
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const commands = [
        '/start - Start the bot',
        '/help - All available commands',
        '/features - All available features',
        '/options - Enter your API and secret key here'
    ];
    bot.sendMessage(chatId, commands.join('\n'));
});

bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;
    if (action == "Transaction history") {

    }
})

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;

    switch (action) {
        case 'My wallet':
            {
                axios.get(`https://localhost:7081/Binance/Balance?apiKey=${apiKey}&secretKey=${secretKey}`, { httpsAgent: agent }).then(async response => {
                    const data = response.data;
                    console.log(data);
                    let usdTotalBalance = 0;
                    let message = "";
                    data.forEach(element => {
                        usdTotalBalance += element.usdPrice;
                        message += `${element.asset}\nCrypto: ${element.total} / USD: ${element.usdPrice} \n\n`;
                    });
                    bot.sendMessage(chatId, `Your total balance in USD: ${usdTotalBalance}  \n\n${message}`,{
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Deposit Address', callback_data: 'Deposit Address' },{ text: 'Withdraw', callback_data: 'Withdraw' },{ text: 'Transaction history', callback_data: 'Transaction history' }],
                                [{ text: 'Create Order', callback_data: 'Create Order' }] 
                            ]
                        }
                    });
                })
                    .catch(error => {
                        bot.sendMessage(chatId, "Try entering your binance details again, type /options");
                        apiKey = "";
                        secretKey = "";
                        console.log(error);
                    });
                break;
            }

        case 'Current price':
            {
                axios.get("https://localhost:7081/Binance/Pair", { httpsAgent: agent }).then(response => {
                    const data = response.data;
                    let message = '';
                    data.forEach(element => {
                        message += `${element.symbol} : ${element.price}\n`
                    });
                    bot.sendMessage(chatId, message);
                })
                    .catch(error => {
                        bot.sendMessage(chatId, "Try entering your binance details again, type /options");
                        apiKey = "";
                        secretKey = "";
                        console.log(error);
                    });
                break;
            }
        case 'Transaction history':
            await bot.sendMessage(chatId, "Choose transaction history type:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Deposit history', callback_data: 'Deposit history' }],
                        [{ text: 'Withdraw history', callback_data: 'Withdraw history' }],
                    ]
                }
            });
            break;
        case 'Deposit history':
            axios.get(`https://localhost:7081/Binance/DepositHistory?apiKey=${apiKey}&secretKey=${secretKey}`, { httpsAgent: agent }).then(response => {
                const data = response.data;
                console.log(data);
                let message = '';
                data.forEach(element => {
                    if (element.status = 1) {
                        element.status = "Success";
                    }
                    else {
                        element.status = "Failed";
                    }
                    message = `Status: ${element.status}\nCoin: ${element.asset}\nAmount: ${element.amount}\nAdress: ${element.adress}\n`;
                    console.log(message);
                    bot.sendMessage(chatId, message);
                });
            }).catch(error => {
                bot.sendMessage(chatId, "Try entering your binance details again, type /options");
                apiKey = "";
                secretKey = "";
                console.log(error);
            });
            break;
        case 'Withdraw history':
            axios.get(`https://localhost:7081/Binance/WithdrawalHistory?apiKey=${apiKey}&secretKey=${secretKey}`, { httpsAgent: agent }).then(response => {
                const data = response.data;
                console.log(data);
                let message = '';
                data.forEach(element => {
                    if (element.status = 1) {
                        element.status = "Success";
                    }
                    else {
                        element.status = "Failed";
                    }
                    message = `Status: ${element.status}\nCoin: ${element.asset}\nAmount: ${element.amount}\nAdress: ${element.adress}\n`;
                    console.log(message);
                    bot.sendMessage(chatId, message);
                });
            }).catch(error => {
                bot.sendMessage(chatId, "Try entering your binance details again, type /options");
                apiKey = "";
                secretKey = "";
                console.log(error);
            });
            break;
    }
    if (action === 'Deposit Address') {
        bot.sendMessage(chatId, "Choose asset:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Litecoin', callback_data: 'LTC' }],
                    [{ text: 'TRON', callback_data: 'TRX' }],
                ]
            }
        });
    } else if (action === 'LTC') {
        const asset = 'LTC';
        const network = 'LTC';
        axios.get(`https://localhost:7081/Binance/DepositAdress?apiKey=${apiKey}&secretKey=${secretKey}&asset=${asset}&network=${network}`, { httpsAgent: agent }).then(response => {
            const data = response.data;
            const message = `Asset: ${asset} , Network: ${network} \nAddress: ${data}`
            bot.sendMessage(chatId, message)
        }).catch(error => {
            bot.sendMessage(chatId, "Try entering your binance details again, type /options");
            apiKey = "";
            secretKey = "";
            console.log(error);
        });
    } else if (action === 'TRX') {
        const asset = 'TRX';
        const network = 'TRX';
        axios.get(`https://localhost:7081/Binance/DepositAdress?apiKey=${apiKey}&secretKey=${secretKey}&asset=${asset}&network=${network}`, { httpsAgent: agent }).then(response => {
            const data = response.data;
            const message = `Asset: ${asset} , Network: ${network} \nAddress: ${data}`
            bot.sendMessage(chatId, message)
        }).catch(error => {
            bot.sendMessage(chatId, "Try entering your binance details again, type /options");
            apiKey = "";
            secretKey = "";
            console.log(error);
        });
    }

    bot.answerCallbackQuery(query.id);
})