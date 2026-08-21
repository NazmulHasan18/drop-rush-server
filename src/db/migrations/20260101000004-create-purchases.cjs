'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('purchases', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      drop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'drops', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      reservation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'reservations', key: 'id' },
        onDelete: 'CASCADE',
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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

    // Powers the "top 3 most recent purchasers per drop" activity feed query.
    await queryInterface.addIndex('purchases', ['drop_id', 'created_at']);
    await queryInterface.addIndex('purchases', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('purchases');
  },
};
