const stex = require('./lib/stex');
const _ = require('lodash');
const fs = require('fs');
const calcPercent = require('calc-percent');

const { Random } = require('random-js');

const random = new Random();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getBalance = async ({ tick = stex.LTC_TICK }) => {
    const balances = await stex.getBalanceTradePair();
    let _balance = _.find(balances, (b) => b.currency_code === tick);
    if (_.isUndefined(_balance) || _.isNull(_balance) || _.isUndefined(_balance.balance)) return 0.0;

    return parseFloat(_balance.balance).toFixed(_places);
};

const hasBalance = ({ balances, tick, minBalance }) => {
    let _balance = _.find(balances, (b) => b.currency_code == tick);
    if (
        _.isUndefined(_balance) ||
        _.isNull(_balance) ||
        _.isUndefined(_balance.balance) ||
        parseFloat(_balance.balance) < minBalance
    ) {
        console.log(`Not enough balance to TRADE ${tick}.`);
        return false;
    }
    return true;
};

(async () => {
    try {
        const balance = await getBalance({ tick: stex.LTC_TICK });
        console.info(balance);
    } catch (e) {
        console.error(e);
    }
})();
