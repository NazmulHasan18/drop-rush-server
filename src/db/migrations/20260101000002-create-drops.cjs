'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('drops', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      available_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sold_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Guard rails at the DB level, on top of application-level checks.
    await queryInterface.sequelize.query(`
      ALTER TABLE drops
      ADD CONSTRAINT chk_available_stock_range
      CHECK (available_stock >= 0 AND available_stock <= total_stock);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('drops');
  },
};
