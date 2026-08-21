'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('drops', {
      fields: ['name'],
      type: 'unique',
      name: 'uq_drops_name',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('drops', 'uq_drops_name');
  },
};
