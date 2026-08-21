import { sequelize } from '../../config/database.js';
import { User } from './user.model.js';
import { Drop } from './drop.model.js';
import { Reservation } from './reservation.model.js';
import { Purchase } from './purchase.model.js';

// Drop <-> Reservation
Drop.hasMany(Reservation, { foreignKey: 'dropId', as: 'reservations' });
Reservation.belongsTo(Drop, { foreignKey: 'dropId', as: 'drop' });

// User <-> Reservation
User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Drop <-> Purchase
Drop.hasMany(Purchase, { foreignKey: 'dropId', as: 'purchases' });
Purchase.belongsTo(Drop, { foreignKey: 'dropId', as: 'drop' });

// User <-> Purchase
User.hasMany(Purchase, { foreignKey: 'userId', as: 'purchases' });
Purchase.belongsTo(User, { foreignKey: 'userId', as: 'buyer' });

// Reservation <-> Purchase (1:1)
Reservation.hasOne(Purchase, { foreignKey: 'reservationId', as: 'purchase' });
Purchase.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

export { sequelize, User, Drop, Reservation, Purchase };
