const _ = require('lodash');
const stex = require('./lib/stex');

const convertToBC = ({ bcUnit = 0.0, ltcAmount = 0.0, ltcPrice = 0.0 }) => {
    return (toFloat(bcUnit) * toFloat(ltcAmount)) / toFloat(ltcPrice);
};

const convertToLTC = ({ ltcUnit = 0.0, bcAmount = 0.0, bcPrice = 0.0 }) => {
    return (toFloat(ltcUnit) * toFloat(bcAmount)) / toFloat(bcPrice);
};

const raiseBidInPct = ({ maxBid = 0.0, pct = 1.0 }) => {
    return (parseFloat(maxBid) * pct) / 100.0 + parseFloat(maxBid);
};
const reduceBidInPct = ({ maxBid = 0.0, pct = 1.0 }) => {
    return parseFloat(maxBid) - (parseFloat(maxBid) * pct) / 100.0;
};

const toFloat = (value) => {
    return parseFloat(parseFloat(value).toFixed(10));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//This method buys and sells at the same time with the same price
const pushOrderToStexToTradeOnlyVolume = async ({ orders = [] }) => {
    let i = 0;
    return await Promise.all(
        orders.map(async (order) => {
            let statusBuy = {};
            let statusSell = {};
            let sellOrder = {};
            try {
                sellOrder = await stex.createSellOrder(order.bcAmount, order.pricePerUnit);
            } catch (e) {
                sellOrder = e;
            }
            let buyOrder = {};
            try {
                buyOrder = await stex.createBuyOrder(order.bcAmount, order.pricePerUnit);
            } catch (e) {
                buyOrder = e;
            }
            await sleep(200);
            if (_.isUndefined(buyOrder.data.id) || _.isUndefined(sellOrder.data.id)) {
                console.log(`Error to create the order -  buy: ${buyOrder.data.id} | sell: ${sellOrder.data.id} | `);

                if (buyOrder !== undefined && buyOrder.data !== undefined && buyOrder.data.id !== undefined) {
                    await stex.cancelTradingOrderByOrderId(buyOrder.data.id);
                }
                if (sellOrder !== undefined && sellOrder.data !== undefined && sellOrder.data.id !== undefined) {
                    await stex.cancelTradingOrderByOrderId(sellOrder.data.id);
                }
            }

            statusBuy = await stex.getTradingOrderByOrderId(buyOrder.data.id);
            statusSell = await stex.getTradingOrderByOrderId(sellOrder.data.id);

            i++;
            return {
                index: i,
                sellOrder: {
                    id: sellOrder?.data?.id,
                    status: _.isUndefined(statusSell?.data?.status) ? 'completed' : statusSell?.data?.status,
                },
                buyOrder: {
                    id: buyOrder?.data?.id,
                    status: _.isUndefined(statusBuy?.data?.status) ? 'completed' : statusBuy?.data?.status,
                },
                order: JSON.stringify(order),
            };
        })
    );
};

//This method is responsible to group orders by price.
//We can't have more than 20 orders with the same price
//So we group and eliminate any duplicated order
const prepareOrderToStex = async ({ orders = [] }) => {
    const grouped = _.chain(
        orders.map((m) => {
            return { bcAmount: m.bcAmount, pricePerUnit: m.pricePerUnit };
        })
    )
        .groupBy((data) => data.pricePerUnit)
        .map((value, key) => {
            return {
                pricePerUnit: parseFloat(key),
                bcAmount: _.sumBy(value, 'bcAmount'),
            };
        })
        .value();

    return grouped;
};

//Process bot to trade only volume assumes we will buy and sell at the same price.
const processBotToTradeOnlyVolume = async () => {
    try {
        //client.set('key', JSON.stringify({ a: 1 }), redis.print);
        //client.get('key', (error, reply) => console.table(JSON.parse(reply)));
        //return;

        const stexBalance = await stex.getBalanceTradePair();

        let BC_BALANCE = parseFloat(stexBalance.find((f) => f.currency_code === 'BC').balance);
        let LTC_BALANCE = parseFloat(stexBalance.find((f) => f.currency_code === 'LTC').balance);

        LTC_BALANCE = LTC_BALANCE / 10.0;

        // let BC_BALANCE = 7000000;
        // let LTC_BALANCE = 27;

        const orderBook = await stex.getBook();
        //if (fs.existsSync('order-book.json')) orderBook = JSON.parse(fs.readFileSync('order-book.json'));

        const minAskInOrders = _.minBy(orderBook.ask, 'price');
        console.log('Lowest price someone wants to sell: ', minAskInOrders.price);
        //console.table(orderBook.bid.sort((a, b) => b.price - a.price));

        const maxBidInOrders = _.maxBy(orderBook.bid, 'price');
        console.log('Biggest price someone wants to pay: ', maxBidInOrders.price);

        //The the biggest bit a normal user is willing to pay per unit of a BC
        const CURRENT_MAX_BID_ON_STEX_IN_LTC_PRICE = toFloat(maxBidInOrders.price);
        console.log('CURRENT_MAX_BID_ON_STEX', CURRENT_MAX_BID_ON_STEX_IN_LTC_PRICE);

        //Rase the bid of the last normal user in 1%
        const MAX_BID_WITH_RAISED_PRICE_IN_LTC_PRICE = toFloat(
            raiseBidInPct({ maxBid: CURRENT_MAX_BID_ON_STEX_IN_LTC_PRICE, pct: 1 })
        );

        console.log('MAX_BID_WITH_RAISED_PRICE', MAX_BID_WITH_RAISED_PRICE_IN_LTC_PRICE);

        //The goal is to create a range between the max amount of the normal user and ours.
        // So BID User = 1.00
        // Our BID = 1.01
        // I can random prices between 1.00 and 1.01

        //Check the max number of BC we can buy with the balance we have and the price we are open to pay
        let TOTAL_BCS_TO_BUY = convertToBC({
            bcUnit: 1.0,
            ltcAmount: LTC_BALANCE,
            ltcPrice: minAskInOrders.price,
        });

        // Check if I am buying more BC THAN I already have in deposit
        // If I can buy more than I actually have in deposit I must decrease a bit the amount of BC
        if (TOTAL_BCS_TO_BUY > BC_BALANCE) TOTAL_BCS_TO_BUY = BC_BALANCE;

        console.table([
            {
                totalBcToBuy: TOTAL_BCS_TO_BUY,
                totalBcBalance: BC_BALANCE,
                totalLtcBalance: LTC_BALANCE,
                minBid: CURRENT_MAX_BID_ON_STEX_IN_LTC_PRICE,
                maxBid: MAX_BID_WITH_RAISED_PRICE_IN_LTC_PRICE,
            },
        ]);

        //Before start creating any order is good to make sure we are canceling it all
        //await stex.cancelOrders();
        let orders = [];
        //While I have BC to sell and LTC to Buy I can create orders
        //I can only create 60 requests to by + 60 to sell per minute. Total 120 per minute;
        while (TOTAL_BCS_TO_BUY > 0 && LTC_BALANCE > 0) {
            // Calculate the random price per unit

            //TRADE ABOVE
            //TRADE Close to MIN ASK
            const CURRENT_RANDOM_BID_IN_LTC_PRICE = stex.random(
                parseFloat(reduceBidInPct({ maxBid: minAskInOrders.price, pct: 1 })),
                parseFloat(minAskInOrders.price)
            );

            const BC_RANDOM_AMOUNT_TO_BUY = stex.random(1, TOTAL_BCS_TO_BUY);
            const TOTAL_IN_LTC_PRICE = CURRENT_RANDOM_BID_IN_LTC_PRICE * BC_RANDOM_AMOUNT_TO_BUY;

            if (TOTAL_BCS_TO_BUY - BC_RANDOM_AMOUNT_TO_BUY > 0 && LTC_BALANCE - TOTAL_IN_LTC_PRICE > 0) {
                TOTAL_BCS_TO_BUY -= BC_RANDOM_AMOUNT_TO_BUY;
                LTC_BALANCE -= TOTAL_IN_LTC_PRICE;
                orders.push({
                    bcAmount: BC_RANDOM_AMOUNT_TO_BUY,
                    pricePerUnit: CURRENT_RANDOM_BID_IN_LTC_PRICE,
                    totalInLtc: TOTAL_IN_LTC_PRICE,
                    totalBcsLeftToBuy: TOTAL_BCS_TO_BUY,
                    totalLtcLeftToSpend: LTC_BALANCE,
                });
            } else {
                //console.log('TOTAL_BCS_TO_BUY', TOTAL_BCS_TO_BUY);
                //console.log('LTC_BALANCE', LTC_BALANCE);
                TOTAL_BCS_TO_BUY = 0;
                LTC_BALANCE = 0;
            }
        }

        console.table(orders.sort((a, b) => a.totalLtcLeftToSpend - b.totalLtcLeftToSpend));

        //We have to prepare the data to remove duplicated prices
        const ordersOnStex = await pushOrderToStexToTradeOnlyVolume({ orders: await prepareOrderToStex({ orders: orders }) });
        console.table(ordersOnStex);
        return ordersOnStex;
    } catch (e) {
        console.error(e);
    }
};

(async () => {
    try {
        while (true) {
            console.log(`Cancel any open order`);
            await stex.cancelOrders();

            await sleep(500);
            console.log(`Process the bot`);
            await processBotToTradeOnlyVolume();

            await sleep(500);
            console.log(`Cancel any open order`);
            await stex.cancelOrders();

            console.log('wait 60 seconds');
            await sleep(60000 * 5);
        }
    } catch (e) {
        console.error(e);
        await stex.cancelOrders();
    }
})();
