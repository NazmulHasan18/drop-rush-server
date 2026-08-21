import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { sequelize } from './db/models/index.js';
import { initSocket } from './sockets/index.js';
import { startExpiryJob } from './jobs/expireReservations.job.js';

const httpServer = createServer(app);
initSocket(httpServer);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    startExpiryJob();

    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.env}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully.');
  httpServer.close(() => process.exit(0));
});

void start();
