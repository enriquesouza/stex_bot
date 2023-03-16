const stex = require('./lib/stex');
const _ = require('lodash');
const fs = require('fs');
const calcPercent = require('calc-percent');

const {
    Random
} = require("random-js");

const random = new Random();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {

        setInterval(() => {
            startBCBotOnStex();
        }, 10000);

    } catch (e) {
        console.error(e);
    }
})();

async function fillUpStock(symbol) {

    let orders = [];
    let total = 0;
    let totalPrice = 0;

    for (let i = 0; i < 15; i++) {

        orders = await stex.getBook();
        let item = orders.ask[0];
        let qty = item.size;

        if (qty > 5000) {
            qty = new Random().real(2000, 5000);
        }

        if (total < 30000) {
            if ((total + qty) >= 30000)
                qty = 30000 - total;

            totalPrice += qty * item.price;

            //let orderBuy = stex.createBuyOrder(qty, item.price);
            console.log(string.Format("[Low BC Balance] - Raise price to: {0} buying {1} BC", orderBuy.price.ToString("F7"), orderBuy.quantity).toString());

            await sleep(new Random().int32(1000, 3500));

        } else
            break;

        total += qty;
    }

}

function calculateAmountOfBCToBuy() {
    stex.MIN_AMOUNT_PER_ORDER_IN_LTC
}

//The Spread is the difference between the Price Someone is willing to pay and the price the person is offering to sell
//If I ask $10 for one BC
//If the max offer is $9.95
//The spread is $10 - $9.95 = $0.05
function calculateSpread(ask, bid) {
    return ask - bid;
}

function calculateMidPrice(ask, bid) {
    return ((ask + bid) / 2).toFixed(8);
}

function showBalances(balances) {
    for (let index in balances) {
        let item = balances[index];
        console.log(item.currency_code + "=>");
        console.log("\t" + "Available:" + item.balance.toString());
        console.log("\t" + "Reserved:" + item.frozen_balance.toString());
        console.log("\t" + "Total:" + (parseFloat(item.frozen_balance) + parseFloat(item.total_balance)).toString());
    }
}

function hasBalance(balances, tick, minBalance) {
    let _balance = _.find(balances, b => b.currency_code == tick);
    if (_.isUndefined(_balance) || _.isNull(_balance) || _.isUndefined(_balance.balance) || parseFloat(_balance.balance) < minBalance) {
        console.log(`Not enough balance to TRADE ${tick}.`);
        return false;
    }
    return true;
}

function getBalance(balances, tick) {
    let _balance = _.find(balances, b => b.currency_code == tick);
    if (_.isUndefined(_balance) || _.isNull(_balance) || _.isUndefined(_balance.balance))
        return 0.0;

    return parseFloat(_balance.balance).toFixed(_places);
}

function subtractBalance(currentBalance, amountToBuy) {
    return (currentBalance - amountToBuy).toFixed(_places);
}

function maxOfBcToBuy(ltcBalance, maxBid) {
    return (ltcBalance / maxBid).toFixed(_places);
}

async function startBCBotOnStex() {

    console.log(`Start the BC bot`)

    this.finished = false;

    let buyChances = [80, 75, 70];

    let buyPercentage = buyChances[stex.randomInt(0, 3)];

    let volumeChances = [70, 60, 50];

    let volumePercentage = volumeChances[stex.randomInt(0, 3)];

    let count = 0;

    let raised = 0;

    let quantityIncrement = 10;

    let _places = 10;

    var addOrders = true;

    await stex.cancelOrders();

    let tradingBalance = await stex.getTradingBalance();

    let filteredBalance = _.filter(tradingBalance, c => c.balance > 0)

    let balances = _.sortBy(filteredBalance, 'currency_code');

    showBalances(balances)

    if (!hasBalance(balances, stex.BC_TICK, 1) || !hasBalance(balances, stex.LTC_TICK, stex.MIN_AMOUNT_PER_ORDER_IN_LTC))
        return;

    console.log("Processing TRADE PAIR:" + stex.TRADE_PAIR);
    //while (count < 10) {

        console.log("RUN TIME " + count);

        addOrders = true;

        let _orders = await stex.getBook();

        if (!_.isUndefined(_orders) && !_.isNull(_orders)) {

            let orders = _orders.data;

            let openOrdersAmount = [];

            for (let i = 0; i < 5; i++) {

                let _amount = (stex.random(3, 1000) * quantityIncrement).toFixed(_places);

                let _askIndex = stex.randomInt(2, 5);

                let existentOrder = _.find(openOrdersAmount, o => o === _amount);

                let askWithTheAmount = _.filter(orders.ask, o => o.price === _amount).length;

                let bidWithTheAmount = _.filter(orders.bid, o => o.price === _amount).length;

                if (_.isUndefined(existentOrder) || _.isNull(existentOrder) && (askWithTheAmount < 20 && bidWithTheAmount < 20)) {
                    //Add the amount to an array. We mush make sure we don't have open orders with the same price
                    openOrdersAmount.push(_amount);

                    //console.log(`Amount: ${_amount} - AskIndex: ${_askIndex}`);

                    //Create Async Orders
                    //console.info(`create SELL orders of the amount: ${_amount} and the price of: ${ orders.ask[_askIndex].price}`);
                    let sellOrder = await stex.createSellOrder(_amount, orders.ask[_askIndex].price);
                    console.log(sellOrder);
                    console.log(sellOrder.data);

                    //console.info(`create BUY orders of the amount: ${_amount} and the price of: ${ orders.ask[_askIndex].price}`);
                    let buyOrder = await stex.createBuyOrder(_amount, orders.bid[_askIndex].price);
                    console.log(buyOrder.data);
                }
            }

            let minAsk = parseFloat(_.minBy(orders.ask, a => a.price).price).toFixed(_places);

            console.log(`MIN SELL price ${minAsk}`)

            let maxBid = parseFloat(_.maxBy(orders.bid, a => a.price).price).toFixed(_places);

            console.log(`MAX BUY price ${maxBid}`)

            if (orders.ask[0].amount >= ((quantityIncrement - 90 /*Only buy UP really small orders*/ ) * 3) || raised > 1) {

                let multiply = 100;
                baseValue = stex.MIN_AMOUNT_PER_ORDER_IN_LTC;
                _places = 8;

                let qty = (stex.randomInt(1, multiply)) * quantityIncrement;

                let spread = calculateSpread(minAsk, maxBid).toFixed(_places);

                let diffPrice = baseValue;
                if (diffPrice < stex.MIN_AMOUNT_PER_ORDER_IN_LTC)
                    diffPrice = stex.MIN_AMOUNT_PER_ORDER_IN_LTC;

                if (spread > baseValue) {

                    let usePrice = minAsk - diffPrice;
                    if (spread == baseValue * 2) {
                        usePrice = minAsk - baseValue;
                    } else {
                        diffPrice = stex.random(diffPrice, spread).toFixed(_places);
                        usePrice = minAsk - diffPrice;
                    }
                    try {
                        if (usePrice < (minAsk * 0.9))
                            usePrice = (minAsk * 0.98);

                        if (buyPercentage > stex.randomInt(100)) {

                            if (usePrice > maxBid) {
                                qty += stex.randomInt(3, 97);

                                await stex.createSellOrder(qty, usePrice);

                                await stex.createBuyOrder(qty, usePrice);
                            }

                        } else {

                            usePrice = maxBid + baseValue;

                            if (usePrice < minAsk) {

                                await stex.createBuyOrder(qty, usePrice);

                                await stex.createSellOrder(qty, usePrice);

                            }
                        }

                    } catch {
                        console.log("Fail to create orders, cancelling all open orders...");
                        await stex.cancelOrders();
                    }

                    raised = 0;

                } else {

                    console.log(`SPREAD => ${spread}`);

                    if (orders.ask[0].amount > 10000) {
                        console.log(`Not enough spread and over 1000 BC:  Bid = ${maxBid} Ask = ${minAsk}`);
                    } else {

                        await stex.createBuyOrder(orders.ask[0].amount, orders.ask[0].price);
                        console.log(`[Spread] - Raise price to: ${orders.ask[0].price.toString()} buying ${orders.ask[0].amount} BC`);
                        raised++;
                    }
                }
            } else {

                if (raised == 0) {

                    await stex.cancelOrders();
                    console.log("Cancel all open orders...".toString());

                }

                await stex.createBuyOrder(orders.ask[0].amount, orders.ask[0].price);
                console.log(`[Low Volume] - Raise price to: ${orders.ask[0].price.toString()}`);
                raised++;

            }
            count++;
            addOrders = false;
            await stex.cancelOrders();
            await sleep(stex.randomInt(5, 5000));
        }
    //}
    await stex.cancelOrders();
}