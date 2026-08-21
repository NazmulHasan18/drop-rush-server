'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reservations', {
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
      status: {
        type: Sequelize.ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('reservations', ['drop_id']);
    await queryInterface.addIndex('reservations', ['user_id']);
    // Speeds up the expiry-sweep cron's "find active reservations past due" query.
    await queryInterface.addIndex('reservations', ['status', 'expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reservations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reservations_status";');
  },
};
