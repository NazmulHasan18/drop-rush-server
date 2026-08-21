import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Drop extends Model<InferAttributes<Drop>, InferCreationAttributes<Drop>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare price: string; // DECIMAL comes back as string from pg; keep precise
  declare totalStock: number;
  declare availableStock: number;
  declare soldCount: CreationOptional<number>;
  declare startsAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Drop.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_stock',
      validate: { min: 0 },
    },
    // available_stock is the single source of truth for "claimable" units.
    // It is decremented atomically at reservation time (not at purchase time)
    // so it always reflects what a new buyer can still grab.
    availableStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'available_stock',
      validate: { min: 0 },
    },
    soldCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sold_count',
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'starts_at',
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'drops',
    modelName: 'Drop',
    timestamps: true,
  },
);
