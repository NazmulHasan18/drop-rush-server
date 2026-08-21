'use strict';
const { randomUUID } = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('drops', [
      {
        id: randomUUID(),
        name: 'Air Jordan 1 Retro High - Chicago',
        price: 220.0,
        total_stock: 10,
        available_stock: 10,
        sold_count: 0,
        starts_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        name: 'Nike Dunk Low - Panda',
        price: 130.0,
        total_stock: 5,
        available_stock: 5,
        sold_count: 0,
        starts_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        name: 'Yeezy Boost 350 V2 - Zebra',
        price: 260.0,
        total_stock: 1,
        available_stock: 1,
        sold_count: 0,
        starts_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('drops', null, {});
  },
};
