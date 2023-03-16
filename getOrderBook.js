const _ = require('lodash');
const np = require('npjs-basic');
const stex = require('./lib/stex');
const { maxBy } = require('lodash');
const fs = require('fs');

(async () => {
    try {
        const orderBook = await stex.getBook();
        fs.writeFileSync('order-book.json', JSON.stringify(orderBook));
    } catch (e) {
        console.error(e);
    }
})();
