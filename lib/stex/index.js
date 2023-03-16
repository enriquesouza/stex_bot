const Promise = require('bluebird');
const _ = require('lodash');
const StocksExchange = require('stocks-exchange-client').client;

Promise.promisifyAll([StocksExchange]);

//#region Const
const TRADE_PAIR = 'BC_LTC';

const TRADE_PAIR_ID = 1095;

const BC_ID = 715; //BC

const BC_TICK = 'BC';

const LTC_ID = 105; //BC

const LTC_TICK = 'LTC';

const ORDER_TYPE_BUY = 'BUY';

const ORDER_TYPE_SELL = 'SELL';

const MIN_AMOUNT_PER_ORDER_IN_LTC = 0.000001;
//#endregion

//#region key to STEX
const option = {
    tokenObject: {
        access_token:
            '',
    },
    accessTokenUrl: 'https://api3.stex.com/oauth/token',
    scope: 'profile trade withdrawal reports push settings',
    s2s: true,
};
const se = new StocksExchange(option, null, 3);
//#endregion

const getMyOrders = async () => {
    const orderBook = await new Promise((resolve, reject) => {
        //List your currently open orders
        se.tradingOrders(function (res) {
            resolve(JSON.parse(res));
        });
    }).then((res) => res.data);

    return orderBook === undefined ? [] : orderBook;
};

async function getTradingBalance() {
    let profileWallets = await getProfileWallets();
    return profileWallets.data;
}

const getBalanceTradePair = async () => {
    const tradingBalance = await getTradingBalance();
    const filteredBalance = _.filter(tradingBalance, (c) => c.balance > 0);
    const balances = _.sortBy(filteredBalance, 'currency_code');
    return balances;
};

async function getBook() {
    const orderBook = await new Promise((resolve, reject) => {
        se.publicOrderbook(
            TRADE_PAIR_ID,
            {
                limit_bids: 100,
                limit_asks: 100,
            },
            function (res) {
                resolve(JSON.parse(res));
            }
        );
    }).then((res) => res.data);

    return orderBook === undefined ? [] : orderBook;
}

async function getProfileInfo() {
    return new Promise((resolve, reject) => {
        se.profileInfo(function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function getProfileWallets() {
    return new Promise((resolve, reject) => {
        //Get a list of user wallets
        se.profileWallets(
            {
                sort: 'DESC',
                sortBy: 'BALANCE',
            },
            function (res) {
                resolve(JSON.parse(res));
            }
        );
    });
}

async function getTicker() {
    return new Promise((resolve, reject) => {
        se.publicTicker(TRADE_PAIR_ID, function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function cancelOrders() {
    return new Promise((resolve, reject) => {
        se.deleteTradingOrdersById(TRADE_PAIR_ID, function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function cancelTradingOrderByOrderId(id) {
    return new Promise((resolve, reject) => {
        se.cancelTradingOrderByOrderId(id, function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function getReportTradingOrderByOrderId(id) {
    return new Promise((resolve, reject) => {
        se.reportsOrdersById(id, function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function getTradingOrderByOrderId(id) {
    return new Promise((resolve, reject) => {
        se.tradingOrderByOrderId(id, function (res) {
            resolve(JSON.parse(res));
        });
    });
}

async function createBuyOrder(_amount, _price) {
    return new Promise((resolve, reject) => {
        se.createTradingOrdersById(
            TRADE_PAIR_ID,
            {
                type: 'BUY',
                amount: _amount,
                price: _price,
            },
            function (res) {
                resolve(JSON.parse(res));
            }
        );
    });
}

async function createSellOrder(_amount, _price) {
    return new Promise((resolve, reject) => {
        se.createTradingOrdersById(
            TRADE_PAIR_ID,
            {
                type: 'SELL',
                amount: _amount,
                price: _price,
            },
            function (res) {
                resolve(JSON.parse(res));
            }
        );
    });
}

function random(low, high) {
    return Math.random() * (high - low) + low;
}

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function leftPad(str, length) {
    str = str == null ? '' : String(str);
    length = ~~length;
    pad = '';
    padLength = length - str.length;

    while (padLength--) {
        pad += '0';
    }

    return pad + str;
}

module.exports = {
    getBook: getBook,
    getProfileInfo: getProfileInfo,
    getProfileWallets: getProfileWallets,
    getTicker: getTicker,
    getTradingBalance: getTradingBalance,
    cancelOrders: cancelOrders,
    createBuyOrder: createBuyOrder,
    createSellOrder: createSellOrder,
    TRADE_PAIR: TRADE_PAIR,
    TRADE_PAIR_ID: TRADE_PAIR_ID,
    BC_ID: BC_ID,
    BC_TICK: BC_TICK,
    LTC_ID: LTC_ID,
    LTC_TICK: LTC_TICK,
    MIN_AMOUNT_PER_ORDER_IN_LTC: MIN_AMOUNT_PER_ORDER_IN_LTC,
    ORDER_TYPE_BUY: ORDER_TYPE_BUY,
    ORDER_TYPE_SELL: ORDER_TYPE_SELL,
    random: random,
    randomInt: randomInt,
    randomIntInc: randomIntInc,
    leftPad: leftPad,
    getBalanceTradePair: getBalanceTradePair,
    stocksExchange: se,
    getMyOrders: getMyOrders,
    cancelTradingOrderByOrderId: cancelTradingOrderByOrderId,
    getTradingOrderByOrderId: getTradingOrderByOrderId,
};
