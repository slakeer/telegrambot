const TelegramApi = require("node-telegram-bot-api");
const https = require('https');
const axios = require('axios');
require('dotenv').config();
const { saveMessage, savePrice } = require('./server');
const { error } = require("console");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const { promisify } = require('util');

const width = 800;
const height = 400; 
const chartCallback = (ChartJS) => { };



const bot = new TelegramApi(process.env.BOT_TOKEN, { polling: true });

let apiKey;
let secretKey;

bot.setMyCommands([
    { command: '/start', description: 'Start the bot' },
    { command: '/options', description: 'Enter your API and secret key here' },
    { command: '/features', description: 'All available features' },
    { command: '/help', description: 'All available commands' },
]);

const orderKeyboard = {
    inline_keyboard: [
        [{ text: 'Price increase', callback_data: 'price_increase' }, { text: 'Price drop', callback_data: 'price_drop' }],
        [{ text: "Menu", callback_data: "Menu" }]
    ]
}
const menuKeyboard = {
    inline_keyboard: [
        [
            { text: 'Deposit Address', callback_data: 'Deposit Address' },
            { text: 'Withdraw', callback_data: 'Withdraw' },
            { text: 'Transaction history', callback_data: 'Transaction history' },
            { text: 'Create Order', callback_data: 'Create Order' }
        ],
        [
            { text: 'Create price reminder', callback_data: 'Create_price_reminder' },
            { text: 'Reset settings', callback_data: 'Reset settings' }
        ]
    ]
};
const keyboard = {
    inline_keyboard: [
        [{ text: 'My wallet', callback_data: 'My wallet' }],
        [{ text: 'Crypto News', callback_data: 'Crypto News' }, { text: 'Current price', callback_data: 'Current price' }, { text: 'Charts', callback_data: 'Charts' }]
    ],
    resize_keyboard: true
};

const assetKeyboard = {
    inline_keyboard: [
        [{ text: 'Bitcoin', callback_data: 'BTC' }, { text: 'Ethereum', callback_data: 'ETH' }, { text: 'Litecoin', callback_data: 'LTC' }],
        [{ text: 'Tron', callback_data: 'TRX' }, { text: 'Ripple(XRP)', callback_data: 'XRP' }],
        [{ text: "Menu", callback_data: "Menu" }]
    ]
}

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
        if (message.startsWith('/')) {
            return;
        }
        if (message.length > 10) {
            apiKey = message;
            bot.sendMessage(chatId, 'Enter your Secret Key:');
        } else {
            bot.sendMessage(chatId, 'API Key is too short. Please enter a valid API Key.');
        }

        bot.once('message', async (msg) => {
            const chatId = msg.chat.id;
            const message = msg.text;
            if (message.startsWith('/')) {
                return;
            }

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

// transaction
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;
    switch (action) {
        case 'Transaction history':
            await bot.sendMessage(chatId, "Choose transaction history type:", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Deposit history', callback_data: 'Deposit history' }, { text: 'Withdraw history', callback_data: 'Withdraw history' }],
                        [{ text: 'Menu', callback_data: 'Menu' }]
                    ]
                }
            });
            break;
        case 'Deposit history':
            axios.get(`https://localhost:7081/Binance/deposit_history?chatId=${chatId}`, { httpsAgent: agent }).then(async response => {
                const data = response.data;
                let message = '';
                for (let i = 0; i < data.length; i++) {
                    const element = data[i];
                    if (element.status === 1) {
                        element.status = "Success";
                    } else {
                        element.status = "Failed";
                    }
                    message = `Status: ${element.status}\nCoin: ${element.asset}\nAmount: ${element.amount}\nAddress: ${element.adress}\n`;
                    await bot.sendMessage(chatId, message);
                }
                // Sending a message with the keyboard after withdrawing recent transactions
                await bot.sendMessage(chatId, "Additional options", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Deposit history', callback_data: 'Deposit history' }, { text: 'Withdraw history', callback_data: 'Withdraw history' }],
                            [{ text: 'Menu', callback_data: 'Menu' }]
                        ]
                    }
                });
            }).catch(error => {
                bot.sendMessage(chatId, "Try entering your Binance details again, type /options");
                apiKey = "";
                secretKey = "";
                console.log(error);
            });
            break;
        case 'Withdraw history':
            axios.get(`https://localhost:7081/Binance/withdrawal_history?chatId=${chatId}`, { httpsAgent: agent }).then(async response => {
                const data = response.data;
                let message = '';
                for (let i = 0; i < data.length; i++) {
                    const element = data[i];
                    if (element.status === 1) {
                        element.status = "Success";
                    } else {
                        element.status = "Failed";
                    }
                    message = `Status: ${element.status}\nCoin: ${element.asset}\nAmount: ${element.amount}\nAddress: ${element.adress}\n`;
                    await bot.sendMessage(chatId, message);
                }
                await bot.sendMessage(chatId, "Additional options", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Deposit history', callback_data: 'Deposit history' }, { text: 'Withdraw history', callback_data: 'Withdraw history' }],
                            [{ text: 'Menu', callback_data: 'Menu' }]
                        ]
                    }
                });
            }).catch(error => {
                bot.sendMessage(chatId, "Try entering your Binance details again, type /options");
                apiKey = "";
                secretKey = "";
                console.log(error);
            });
            break;

        case "Withdraw":
            bot.sendMessage(chatId, "Please provide the withdrawal address");
            bot.once("message", (msg) => {
                let withdrawAddress = msg.text;
                if (withdrawAddress.length > 20) {
                    bot.sendMessage(chatId, "What cryptocurrency do you want to transfer? Example: LTC ");
                    bot.once("message", (msg) => {
                        let asset = msg.text;
                        bot.sendMessage(chatId, "Please enter the quantity of cryptocurrency to be transferred");
                        bot.once("message", (msg) => {
                            let quantity = msg.text;
                            axios.get(`https://localhost:7081/Binance/withdraw?chatId=${chatId}&address=${withdrawAddress}&asset=${asset}&quantity=${quantity}`, { httpsAgent: agent }).then(async response => {
                                const data = response.data;
                                message = `Address: ${data.adress}\nCoin: ${data.asset}\nAmount: ${data.quantity}\nNetwork: ${data.network}\n`;
                                if (response.data === true) {
                                    bot.sendMessage(chatId, "Withdrawal completed.", { reply_markup: menuKeyboard });
                                    bot.sendMessage(chatId, message);
                                } else {
                                    bot.sendMessage(chatId, `Withdrawal failed: ${data.error}, please try again`, { reply_markup: menuKeyboard });
                                }
                            }).catch(error => {
                                if (error.response.data.error.trim() === "Error: -4026: User has insufficient balance") {
                                    bot.sendMessage(chatId, "Insufficient balance");
                                } else {
                                    bot.sendMessage(chatId, `Withdrawal failed: ${error.response.data.error}, please try again.`, { reply_markup: menuKeyboard });
                                    apiKey = "";
                                    secretKey = "";
                                    console.log(error);
                                }

                            });
                        });
                    });
                } else {
                    bot.sendMessage(chatId, "Wrong address. Please check the withdrawal address.", { reply_markup: menuKeyboard });
                }
            });
            break;
    }
})

//deposit adresses
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;

    if (action === 'Deposit Address') {
        bot.sendMessage(chatId, "Choose asset:", { reply_markup: assetKeyboard });
    }
    if (action === 'BTC' || action === 'ETH' || action === 'LTC' || action === 'TRX' || action === 'XRP') {
        getDepositAddress(action, chatId);
    }
    function getDepositAddress(action, chatId) {
        const asset = action;
        const network = action;
        axios.get(`https://localhost:7081/Binance/deposit_adress?chatId=${chatId}&asset=${asset}&network=${network}`, { httpsAgent: agent }).then(response => {
            const data = response.data;
            const message = `Asset: ${asset} , Network: ${network} \nAddress: ${data}`;
            bot.sendMessage(chatId, message, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Menu', callback_data: 'Menu' }]
                    ]
                }
            });
        }).catch(error => {
            bot.sendMessage(chatId, "Try entering your binance details again, type /options");
            apiKey = "";
            secretKey = "";
            console.log(error);
        });
    }
});
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;

    if (action === 'Create Order') {
        bot.sendMessage(chatId, "Order types", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Buy', callback_data: 'order_buy' }, { text: 'Sell', callback_data: 'order_sell' }, { text: 'Cancel order', callback_data: 'Cancel order' }],
                    [{ text: 'Menu', callback_data: 'Menu' }]
                ]
            }
        });
    }
    else if (action === 'order_buy') {
        bot.sendMessage(chatId, "What cryptocurrency do you want to buy? Example: BTCUSDT");
        bot.once('message', (msg) => {
            const message = msg.text;
            let cryptocurrency = "";
            if (message != null) {
                cryptocurrency = message.toUpperCase();
                bot.sendMessage(chatId, "Order amount. Minimum amount: 0.11");
            }
            bot.once('message', (msg) => {
                const message = msg.text;
                const amountString = message.replace(',', '.');
                const amount = parseFloat(amountString);

                if (!isNaN(message) && message >= amount) {
                    axios.post(`http://localhost:5197/Binance/create_order_buy?chatId=${chatId}&symbol=${cryptocurrency}&quantity=${amount}`)
                        .then((response) => {
                            const data = response.data;
                            console.log(data.side)
                            let side;
                            let status;
                            if (data.side === 0) {
                                side = "Buy"
                            }
                            if (data.status === 2) {
                                status = "Filled"
                            }
                            if (data.status === 5) {
                                status = "Failed"
                            }
                            let messageText = `Placing a buy order: \n\nCryptocurrency: ${data.symbol}\nAmount: ${data.quantity}\nSide: ${side}\nId: ${data.id}\nStatus: ${status}`;
                            bot.sendMessage(chatId, messageText, {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: 'Menu', callback_data: 'Menu' }]
                                    ]
                                }
                            });
                        })
                        .catch((error) => {
                            bot.sendMessage(chatId, "Error placing order. Please try again.");
                            console.log(error);
                        });
                } else {
                    bot.sendMessage(chatId, "Sum must be higher than 5$");
                }
            });
        });
    }
    else if (action === 'order_sell') {
        bot.sendMessage(chatId, "What cryptocurrency do you want to sell? Example: BTCUSDT");
        bot.once('message', (msg) => {
            const message = msg.text;
            if (message.startsWith('/')) {
                return;
            }
            let cryptocurrency = "";
            if (message != null) {
                cryptocurrency = message.toUpperCase();
                bot.sendMessage(chatId, "Order amount. Minimum amount: 0.11");
            }
            bot.once('message', (msg) => {
                const message = msg.text;
                if (message.startsWith('/')) {
                    return;
                }
                const amountString = message.replace(',', '.');
                const amount = parseFloat(amountString);

                if (!isNaN(message) && message >= amount) {
                    axios.post(`http://localhost:5197/Binance/create_order_sell?chatId=${chatId}&symbol=${cryptocurrency}&quantity=${amount}`)
                        .then((response) => {
                            const data = response.data;
                            console.log(data.side)
                            let side;
                            let status;
                            if (data.side === 0) {
                                side = "Sell"
                            }
                            if (data.status === 2) {
                                status = "Filled"
                            }
                            if (data.status === 5) {
                                status = "Failed"
                            }
                            let messageText = `Placing a sell order: \n\nCryptocurrency: ${data.symbol}\nAmount: ${data.quantity}\nSide: ${side}\nId: ${data.id}\nStatus: ${status}`;
                            bot.sendMessage(chatId, messageText, {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: 'Menu', callback_data: 'Menu' }]
                                    ]
                                }
                            });
                        })
                        .catch((error) => {
                            bot.sendMessage(chatId, `Error placing order. Please try again. ${error}`);
                            console.log(error);
                        });
                } else {
                    bot.sendMessage(chatId, "Sum must be higher than " + amount);
                }
            });
        });
    }
    else if (action === 'Cancel order') {
        bot.sendMessage(chatId, "Enter the name of the cryptocurrency");
        bot.once('message', (msg) => {
            const message = msg.text;
            if (message.startsWith('/')) {
                return;
            };
            axios.get(`https://localhost:7081/Binance/cancel_order?chatId=${chatId}&Symbol=${message}`, { httpsAgent: agent }).then(async response => {
                const data = response.data;
                bot.sendMessage(chatId, `Status: ${data}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Buy', callback_data: 'order_buy' }, { text: 'Sell', callback_data: 'order_sell' }, { text: 'Cancel order', callback_data: 'Cancel order' }],
                            [{ text: 'Menu', callback_data: 'Menu' }]
                        ]
                    }

                });
            });
        });
    }
});


//main functions
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;

    switch (action) {
        case 'My wallet':
            {
                axios.get(`https://localhost:7081/Binance/Balance?chatId=${chatId}`, { httpsAgent: agent }).then(async response => {
                    const data = response.data;
                    console.log(data);
                    let usdTotalBalance = 0;
                    let message = "";
                    data.forEach(element => {
                        usdTotalBalance += element.usdPrice;
                        message += `${element.asset}: ${element.total} / USD: ${element.usdPrice} \n\n`;
                    });
                    bot.sendMessage(chatId, `Your total balance in USD: ${usdTotalBalance}  \n\n${message}`, { reply_markup: menuKeyboard });
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
                axios.get(`https://localhost:7081/Binance/Pair?chatId=${chatId}`, { httpsAgent: agent }).then(response => {
                    const data = response.data;
                    let message = '';
                    data.forEach(element => {
                        message += `${element.symbol} : ${element.price}\n`
                    });
                    bot.sendMessage(chatId, message, { reply_markup: keyboard });
                })
                    .catch(error => {
                        bot.sendMessage(chatId, "Try entering your binance details again, type /options");
                        apiKey = "";
                        secretKey = "";
                        console.log(error);
                    });
                break;
            }

        case "Menu": {
            axios.get(`https://localhost:7081/Binance/Balance?chatId=${chatId}`, { httpsAgent: agent }).then(async response => {
                const data = response.data;
                console.log(data);
                let usdTotalBalance = 0;
                let message = "";
                data.forEach(element => {
                    usdTotalBalance += element.usdPrice;
                    message += `${element.asset}\nCrypto: ${element.total} / USD: ${element.usdPrice} \n\n`;
                });
                bot.sendMessage(chatId, `Your total balance in USD: ${usdTotalBalance}  \n\n${message}`, { reply_markup: menuKeyboard });
            }).catch((error) => {
                bot.sendMessage(chatId, `Error placing order. Please try again. ${error}`);
                console.log(error);
            });
            break;
        }
        case "Reset settings": {
            axios.delete(`https://localhost:7081/Binance/delete_user_data?chatId=${chatId}`, { httpsAgent: agent }).then(async response => {
                if (response.status === 200) {
                    bot.sendMessage(chatId, "Data deleted successfully")
                }
                else {
                    bot.sendMessage(chatId, "Error when deleting data")
                }
            }).catch(error => {
                bot.sendMessage(chatId, `Error while executing request: ${error}`)
            });
            break;
        }
        case "Charts": {
            bot.sendMessage(chatId, "Enter the trading pair (e.g., BTCUSDT)").then(() => {
                bot.once('message', (msg) => {
                    if (msg.text.startsWith('/')) {
                        return;
                    }
                    if (msg.chat.id === chatId) {
                        const symbol = msg.text.trim();

                        bot.sendMessage(chatId, "Enter the start date and time (in format YYYY-MM-DD HH:mm:ss)").then(() => {
                            bot.once('message', (msg) => {
                                if (msg.text.startsWith('/')) {
                                    return;
                                }
                                if (msg.chat.id === chatId) {
                                    const startTime = msg.text.trim();

                                    bot.sendMessage(chatId, "Enter the end date and time (in format YYYY-MM-DD HH:mm:ss)").then(() => {
                                        bot.once('message', async (msg) => {
                                            if (msg.text.startsWith('/')) {
                                                return;
                                            }
                                            if (msg.chat.id === chatId) {
                                                const endTime = msg.text.trim();

                                                await bot.sendMessage(chatId, "Available Intervals:\n60(1min), 180(3min), 300(5min), 900(15min), 1800(30min), 3600(1h) 7200(2h), 14400(4h), 21600(6h), 28800(8h), 43200(12h), 86400(24h)");
                                                bot.sendMessage(chatId, "Enter the interval (in seconds)").then(() => {
                                                    bot.once('message', async (msg) => {
                                                        if (msg.text.startsWith('/')) {
                                                            return;
                                                        }
                                                        if (msg.chat.id === chatId && !msg.text.startsWith("/")) {
                                                            const interval = msg.text.trim();
                                                            const url = `https://localhost:7081/Binance/get_klines?chatId=${chatId}&symbol=${symbol}&Interval=${interval}&startTime=${startTime}&endTime=${endTime}`;

                                                            axios.get(url, { httpsAgent: agent }).then(async (response) => {
                                                                const data = response.data;
                                                                let labels = [];
                                                                let prices = [];
                                                                const renderChart = async (labels, prices) => {
                                                                    const canvas = new ChartJSNodeCanvas({ width, height, chartCallback });
                                                                
                                                                    const configuration = {
                                                                        type: 'line',
                                                                        data: {
                                                                            labels,
                                                                            datasets: [
                                                                                {
                                                                                    label: 'Price',
                                                                                    data: prices,
                                                                                    fill: false,
                                                                                    borderColor: 'rgb(75, 192, 192)',
                                                                                    tension: 0.1
                                                                                }
                                                                            ]
                                                                        },
                                                                        options: {
                                                                            scales: {
                                                                                x: {
                                                                                    display: true,
                                                                                    title: {
                                                                                        display: true,
                                                                                        text: 'Date'
                                                                                    }
                                                                                },
                                                                                y: {
                                                                                    display: true,
                                                                                    title: {
                                                                                        display: true,
                                                                                        text: 'Price'
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    };
                                                                
                                                                    const image = await canvas.renderToBuffer(configuration);
                                                                    const imagePath = `chart_${Date.now()}.png`;
                                                                
                                                                    const writeFileAsync = promisify(fs.writeFile);
                                                                    await writeFileAsync(imagePath, image);
                                                                
                                                                    return imagePath;
                                                                };
                                    
                                                                data.forEach(element => {
                                                                  labels.push(element.openTime);
                                                                  prices.push(element.closePrice);
                                                                });
                                    
                                                                const imagePath = await renderChart(labels, prices);
                                    
                                                                const imageStream = fs.createReadStream(imagePath);
                                                                bot.sendPhoto(chatId, imageStream).then(() => {
                                                                  // Удалите временный файл с графиком
                                                                  fs.unlinkSync(imagePath);
                                                                }).catch(error => {
                                                                  console.error(error);
                                                                });
                                                              }).catch(error => {
                                                                console.error(error);
                                                                bot.sendMessage(chatId, "An error occurred while retrieving the chart data.", { reply_markup: keyboard });
                                                              });
                                                            }
                                                          });
                                                        });
                                                      }
                                                    });
                                                  });
                                                }
                                              });
                                            });
                                          }
                                        });
                                      });
                                      break;
                                    }
        case "Create_price_reminder": {
            bot.sendMessage(chatId, "Select type", {
                reply_markup: orderKeyboard
            });
            break;
        };
        case "price_drop": {
            bot.sendMessage(chatId, "Choose a cryptocurrency to set a drop reminder. Example: BTCUSDT");
            bot.once("message", async (msg) => {
                if (msg.text.startsWith('/')) {
                    return;
                }
                try {
                    const cryptocurrency = msg.text;
                    const response = await axios.get(`https://localhost:7081/Binance/price_reminder?chatId=${chatId}&symbol=${cryptocurrency}`, { httpsAgent: agent });
                    const data = response.data;
                    bot.sendMessage(chatId, `Price at the moment: ${data.price}. Select the price to set the notification`);
                    bot.once("message", async (msg) => {
                        if (msg.text.startsWith('/')) {
                            return;
                        }
                        const notificationPrice = parseFloat(msg.text);
                        if (!isNaN(notificationPrice)) {
                            savePrice(chatId, cryptocurrency, notificationPrice);
                            bot.sendMessage(chatId, "Price reminder has been set successfully.", { reply_markup: orderKeyboard });
                            checkPriceFall(chatId, cryptocurrency, notificationPrice);
                        } else {
                            bot.sendMessage(chatId, "Invalid price. Please enter a valid number.", { reply_markup: orderKeyboard });
                        }
                    });

                } catch (error) {
                    console.error("Error getting price:", error);
                    bot.sendMessage(chatId, "Failed to get the price. Please try again later.", { reply_markup: orderKeyboard });
                }
            });
            const checkPriceFall = async (chatId, cryptocurrency, notificationPrice) => {
                try {
                    let isNotified = false;

                    while (true) {
                        const response = await axios.get(`https://localhost:7081/Binance/price_reminder?chatId=${chatId}&symbol=${cryptocurrency}`, { httpsAgent: agent });
                        const data = response.data;
                        const currentPrice = data.price;

                        if (!isNotified && currentPrice < notificationPrice) {
                            bot.sendMessage(chatId, `Current price ${currentPrice} is lower than your notification price ${notificationPrice}.`, { reply_markup: menuKeyboard });
                            return;
                        }

                        if (currentPrice >= notificationPrice) {
                            isNotified = false;
                        }
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                } catch (error) {
                    console.error('Error checking price:', error);
                    bot.sendMessage(chatId, 'Failed to check the price. Please try again later.', { reply_markup: orderKeyboard });
                }
                finally {
                    isNotified = false;
                    currentPrice = null;
                }
            };
            break;
        };
        case "price_increase": {
            bot.sendMessage(chatId, "Choose a cryptocurrency to set a increase reminder. Example: BTCUSDT");
            bot.once("message", async (msg) => {
                if (msg.text.startsWith('/')) {
                    return;
                }
                try {
                    const cryptocurrency = msg.text;
                    const response = await axios.get(`https://localhost:7081/Binance/price_reminder?chatId=${chatId}&symbol=${cryptocurrency}`, { httpsAgent: agent });
                    const data = response.data;
                    bot.sendMessage(chatId, `Price at the moment: ${data.price}. Select the price to set the notification`);
                    bot.once("message", async (msg) => {
                        if (msg.text.startsWith('/')) {
                            return;
                        }
                        const notificationPrice = parseFloat(msg.text);
                        if (!isNaN(notificationPrice)) {
                            savePrice(chatId, cryptocurrency, notificationPrice);
                            bot.sendMessage(chatId, "Price reminder has been set successfully.", { reply_markup: orderKeyboard });
                            checkPriceRise(chatId, cryptocurrency, notificationPrice);
                        } else {
                            bot.sendMessage(chatId, "Invalid price. Please enter a valid number.", { reply_markup: orderKeyboard });
                        }
                    });
                }
                catch (error) {
                    console.error("Error getting price:", error);
                    bot.sendMessage(chatId, "Failed to get the price. Please try again later.", { reply_markup: orderKeyboard });
                }
            });
            const checkPriceRise = async (chatId, cryptocurrency, notificationPrice) => {
                try {
                    while (true) {
                        const response = await axios.get(`https://localhost:7081/Binance/price_reminder?chatId=${chatId}&symbol=${cryptocurrency}`, { httpsAgent: agent });
                        const data = response.data;
                        const currentPrice = data.price;

                        if (currentPrice >= notificationPrice) {
                            bot.sendMessage(chatId, `Current price ${currentPrice} is higher than or equal to your notification price ${notificationPrice}.`, { reply_markup: menuKeyboard });
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                } catch (error) {
                    console.error("Error checking price:", error);
                    bot.sendMessage(chatId, "Failed to check the price. Please try again later.", { reply_markup: orderKeyboard });
                }
            };
            break;
        }
        case "Crypto News": {
            axios.get('https://localhost:7081/CryptoState/get_news', { httpsAgent: agent }).then(async response => {
                const data = response.data;
                let message = `Title: ${data.title}\nLink: ${data.link}`;
                bot.sendMessage(chatId, `News\n\n${message}`, { reply_markup: keyboard });
            }).catch(error => {
                bot.sendMessage(chatId, `Error while executing request: ${error}`, { reply_markup: keyboard })
            });
            break;
        }
    }
    bot.answerCallbackQuery(query.id);
})
